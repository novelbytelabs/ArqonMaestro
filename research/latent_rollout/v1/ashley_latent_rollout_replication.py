from __future__ import annotations
import argparse, json, random, time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset


def set_seed(seed:int)->None:
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)

@dataclass
class Config:
    seed:int=42; device:str='cpu'; outdir:str='/mnt/data/ashley_replication_outputs'
    systems:Tuple[str,...]=('heat','wave')
    n_train:int=256; n_val:int=64; n_test:int=64; grid_size:int=64; rollout_len:int=48; dt:float=0.05
    latent_dim:int=16; hidden_dim:int=128; batch_size:int=64; ae_epochs:int=10; dyn_epochs:int=15; lr:float=1e-3
    multi_horizon:bool=True; horizons:Tuple[int,...]=(1,2,4,8)
    hybrid_intervals:Tuple[int,...]=(4,8,16); branch_candidates:int=5; branch_noise:float=0.01
    grounding_quantize_levels:int=128; grounding_blur_alpha:float=0.08


def spatial_grid(n:int)->np.ndarray:
    return np.linspace(0,2*np.pi,n,endpoint=False)

def random_initial_field(system:str,n:int)->np.ndarray:
    x=spatial_grid(n); y=np.zeros_like(x); coeffs=6
    for k in range(1,coeffs+1):
        a=np.random.randn()*np.exp(-0.35*k); b=np.random.randn()*np.exp(-0.35*k)
        y += a*np.sin(k*x)+b*np.cos(k*x)
    y/=max(np.std(y),1e-6)
    if system=='heat': return y.astype(np.float32)
    v=np.zeros_like(y)
    for k in range(1,coeffs+1):
        a=np.random.randn()*np.exp(-0.35*k); b=np.random.randn()*np.exp(-0.35*k)
        v += a*np.sin(k*x)+b*np.cos(k*x)
    v/=max(np.std(v),1e-6)
    return np.stack([y,0.35*v],axis=0).astype(np.float32)

def simulate_heat(u0:np.ndarray,steps:int,dt:float)->np.ndarray:
    n=u0.shape[-1]; freq=np.fft.fftfreq(n); k=2*np.pi*freq; uhat0=np.fft.fft(u0); states=[]
    for t in range(steps+1):
        u=np.fft.ifft(uhat0*np.exp(-(k**2)*dt*t)).real.astype(np.float32); states.append(u)
    return np.stack(states,axis=0)

def simulate_wave(state0:np.ndarray,steps:int,dt:float)->np.ndarray:
    u0,v0=state0[0],state0[1]; n=u0.shape[-1]; c=1.0; freq=np.fft.fftfreq(n); k=2*np.pi*freq; abs_k=np.abs(k)
    uhat0=np.fft.fft(u0); vhat0=np.fft.fft(v0); eps=1e-8; states=[]
    for t in range(steps+1):
        tau=dt*t; cos=np.cos(c*abs_k*tau); sin=np.sin(c*abs_k*tau)
        uhat = cos*uhat0 + np.where(abs_k>eps, sin*vhat0/(c*abs_k+eps), tau*vhat0)
        vhat = -sin*(c*abs_k)*uhat0 + cos*vhat0
        u=np.fft.ifft(uhat).real.astype(np.float32); v=np.fft.ifft(vhat).real.astype(np.float32)
        states.append(np.stack([u,v],axis=0))
    return np.stack(states,axis=0)

def generate_dataset(system:str,count:int,grid_size:int,rollout_len:int,dt:float)->np.ndarray:
    sims=[]
    for _ in range(count):
        s0=random_initial_field(system,grid_size)
        sims.append(simulate_heat(s0,rollout_len,dt) if system=='heat' else simulate_wave(s0,rollout_len,dt))
    return np.stack(sims,axis=0)

def flatten_states(x:np.ndarray)->np.ndarray:
    return x.reshape(x.shape[0],x.shape[1],-1)

def corrupt_grounding(x:torch.Tensor, levels:int, blur_alpha:float)->torch.Tensor:
    if levels>1:
        scale=levels-1.0; xmin=x.amin(dim=-1,keepdim=True); xmax=x.amax(dim=-1,keepdim=True)
        q=torch.round(((x-xmin)/(xmax-xmin+1e-6))*scale)/scale; x=q*(xmax-xmin)+xmin
    if x.shape[-1]>=3:
        x=(1-blur_alpha)*x + 0.5*blur_alpha*(torch.roll(x,1,-1)+torch.roll(x,-1,-1))
    return x

def rel_mse(pred:np.ndarray,target:np.ndarray)->float:
    return float(np.mean((pred-target)**2)/(np.mean(target**2)+1e-12))

class AutoEncoder(nn.Module):
    def __init__(self,input_dim:int,latent_dim:int,hidden_dim:int):
        super().__init__()
        self.encoder=nn.Sequential(nn.Linear(input_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,latent_dim))
        self.decoder=nn.Sequential(nn.Linear(latent_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,input_dim))
    def encode(self,x): return self.encoder(x)
    def decode(self,z): return self.decoder(z)
    def forward(self,x): return self.decode(self.encode(x))

class LatentDynamics(nn.Module):
    def __init__(self,latent_dim:int,hidden_dim:int):
        super().__init__(); self.net=nn.Sequential(nn.Linear(latent_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,hidden_dim),nn.GELU(),nn.Linear(hidden_dim,latent_dim))
    def forward(self,z): return z+self.net(z)

def train_ae(model, train_flat, val_flat, cfg):
    device=torch.device(cfg.device); model.to(device); opt=torch.optim.Adam(model.parameters(), lr=cfg.lr)
    ds=TensorDataset(torch.from_numpy(train_flat.reshape(-1,train_flat.shape[-1])).float())
    loader=DataLoader(ds,batch_size=cfg.batch_size,shuffle=True)
    best=float('inf'); best_state=None
    for _ in range(cfg.ae_epochs):
        model.train()
        for (xb,) in loader:
            xb=xb.to(device); loss=F.mse_loss(model(xb),xb); opt.zero_grad(); loss.backward(); opt.step()
        model.eval();
        with torch.no_grad():
            val=torch.from_numpy(val_flat.reshape(-1,val_flat.shape[-1])).float().to(device); v=F.mse_loss(model(val),val).item()
        if v<best: best=v; best_state={k:v.detach().cpu().clone() for k,v in model.state_dict().items()}
    model.load_state_dict(best_state); return {'ae_best_val_mse':best}

def make_step_loader(flat,batch):
    cur=flat[:,:-1,:].reshape(-1,flat.shape[-1]); nxt=flat[:,1:,:].reshape(-1,flat.shape[-1])
    return DataLoader(TensorDataset(torch.from_numpy(cur).float(), torch.from_numpy(nxt).float()), batch_size=batch, shuffle=True)

def train_dyn(ae,dyn,train_flat,val_flat,cfg):
    device=torch.device(cfg.device); ae.to(device); dyn.to(device); ae.eval();
    for p in ae.parameters(): p.requires_grad=False
    opt=torch.optim.Adam(dyn.parameters(), lr=cfg.lr); loader=make_step_loader(train_flat,cfg.batch_size)
    train_tensor=torch.from_numpy(train_flat).float().to(device); val_tensor=torch.from_numpy(val_flat).float().to(device)
    best=float('inf'); best_state=None; horizons=cfg.horizons if cfg.multi_horizon else (1,)
    for _ in range(cfg.dyn_epochs):
        dyn.train()
        for xb,yb in loader:
            xb=xb.to(device); yb=yb.to(device)
            with torch.no_grad(): z=ae.encode(xb); zt=ae.encode(yb)
            loss=F.mse_loss(dyn(z),zt)
            if cfg.multi_horizon:
                idx=torch.randint(0,train_tensor.shape[0],(min(cfg.batch_size,train_tensor.shape[0]),),device=device); seq=train_tensor[idx]
                start_max=seq.shape[1]-max(horizons)-1
                if start_max>0:
                    t0=torch.randint(0,start_max,(seq.shape[0],),device=device); extra=0.0; cnt=0
                    for h in horizons:
                        x0=seq[torch.arange(seq.shape[0]),t0]; xh=seq[torch.arange(seq.shape[0]),t0+h]
                        with torch.no_grad(): z0=ae.encode(x0); zh=ae.encode(xh)
                        zp=z0
                        for _ in range(h): zp=dyn(zp)
                        extra += F.mse_loss(zp,zh); cnt += 1
                    loss=0.5*loss+0.5*(extra/max(cnt,1))
            opt.zero_grad(); loss.backward(); opt.step()
        dyn.eval(); vals=[]
        with torch.no_grad():
            for h in horizons:
                if val_tensor.shape[1]<=h: continue
                z0=ae.encode(val_tensor[:,0,:]); zh=ae.encode(val_tensor[:,h,:]); zp=z0
                for _ in range(h): zp=dyn(zp)
                vals.append(F.mse_loss(zp,zh).item())
        v=float(np.mean(vals)) if vals else float('inf')
        if v<best: best=v; best_state={k:v.detach().cpu().clone() for k,v in dyn.state_dict().items()}
    dyn.load_state_dict(best_state); return {'dyn_best_val_latent_mse':best}

def rollout_latent(ae,dyn,x0,steps):
    z=ae.encode(x0); preds=[x0]
    for _ in range(steps): z=dyn(z); preds.append(ae.decode(z))
    return torch.stack(preds,dim=1)

def rollout_state(ae,dyn,x0,steps,cfg):
    x=x0; preds=[x0]
    for _ in range(steps):
        z=dyn(ae.encode(x)); x=corrupt_grounding(ae.decode(z),cfg.grounding_quantize_levels,cfg.grounding_blur_alpha); preds.append(x)
    return torch.stack(preds,dim=1)

def rollout_hybrid(ae,dyn,x0,steps,interval,cfg):
    z=ae.encode(x0); preds=[x0]
    for t in range(1,steps+1):
        z=dyn(z); x=ae.decode(z)
        if interval>0 and t%interval==0: x=corrupt_grounding(x,cfg.grounding_quantize_levels,cfg.grounding_blur_alpha); z=ae.encode(x)
        preds.append(x)
    return torch.stack(preds,dim=1)

def rollout_branch(ae,dyn,x0,steps,cfg):
    z=ae.encode(x0); preds=[x0]
    for _ in range(steps):
        base=dyn(z); cands=[base]
        for _ in range(cfg.branch_candidates-1): cands.append(base + torch.randn_like(base)*cfg.branch_noise)
        cand=torch.stack(cands,dim=1); step_norm=torch.norm(cand-z.unsqueeze(1),dim=-1); norm_gap=torch.abs(torch.norm(cand,dim=-1)-torch.norm(base,dim=-1,keepdim=True))
        score=step_norm+0.25*norm_gap; idx=torch.argmin(score,dim=1); z=cand[torch.arange(cand.shape[0],device=cand.device),idx]; preds.append(ae.decode(z))
    return torch.stack(preds,dim=1)

def evaluate(system,ae,dyn,test_flat,cfg):
    device=torch.device(cfg.device); x=torch.from_numpy(test_flat).float().to(device); x0=x[:,0,:]; steps=x.shape[1]-1; truth=x.cpu().numpy(); rows=[]
    with torch.no_grad():
        strategies={'latent':rollout_latent(ae,dyn,x0,steps),'state':rollout_state(ae,dyn,x0,steps,cfg),'latent_branch':rollout_branch(ae,dyn,x0,steps,cfg)}
        for h in cfg.hybrid_intervals: strategies[f'hybrid_{h}']=rollout_hybrid(ae,dyn,x0,steps,h,cfg)
        for name,pred in strategies.items():
            p=pred.cpu().numpy(); rows.append({'system':system,'strategy':name,'full_rel_mse':rel_mse(p,truth),'tail16_rel_mse':rel_mse(p[:,-16:,:],truth[:,-16:,:]),'final_step_rel_mse':rel_mse(p[:,-1,:],truth[:,-1,:])})
    return pd.DataFrame(rows)

def plot_bars(df,outdir):
    for system,sdf in df.groupby('system'):
        sdf=sdf.sort_values('full_rel_mse'); plt.figure(figsize=(8,4.5)); plt.bar(sdf['strategy'],sdf['full_rel_mse']); plt.xticks(rotation=30,ha='right'); plt.ylabel('Relative MSE'); plt.title(f'{system}: strategy comparison'); plt.tight_layout(); plt.savefig(outdir/f'{system}_strategy_comparison.png',dpi=180); plt.close()

def plot_example(system,ae,dyn,test_flat,cfg,outdir):
    device=torch.device(cfg.device); x=torch.from_numpy(test_flat[:1]).float().to(device); x0=x[:,0,:]; steps=x.shape[1]-1
    with torch.no_grad():
        packs={'truth':x[0].cpu().numpy(),'latent':rollout_latent(ae,dyn,x0,steps)[0].cpu().numpy(),'state':rollout_state(ae,dyn,x0,steps,cfg)[0].cpu().numpy(),f'hybrid_{cfg.hybrid_intervals[0]}':rollout_hybrid(ae,dyn,x0,steps,cfg.hybrid_intervals[0],cfg)[0].cpu().numpy()}
    picks=[0,min(8,steps),min(24,steps),steps]
    fig,axes=plt.subplots(len(packs),len(picks),figsize=(12,8),squeeze=False)
    for r,(name,arr) in enumerate(packs.items()):
        for c,t in enumerate(picks):
            ax=axes[r][c]; field=arr[t] if system=='heat' else arr[t][:arr[t].shape[0]//2]; ax.plot(field)
            if r==0: ax.set_title(f't={t}')
            if c==0: ax.set_ylabel(name)
    plt.suptitle(f'{system}: example rollout snapshots'); plt.tight_layout(rect=(0,0,1,0.96)); plt.savefig(outdir/f'{system}_example_rollout.png',dpi=180); plt.close(fig)

def write_summary(cfg, logs, results, outdir):
    lines=['# Ashley Latent Rollout Replication Summary\n','## Configuration\n','```json',json.dumps(asdict(cfg),indent=2),'```\n','## Training logs\n']
    for system,vals in logs.items():
        lines.append(f'### {system}\n')
        for k,v in vals.items(): lines.append(f'- {k}: {v:.6f}')
        lines.append('')
    lines.append('## Results\n'); lines.append(results.to_markdown(index=False)); lines.append('\n## Suggested extensions\n- Add Burgers and reaction-diffusion\n- Add adaptive selector trained on long-horizon loss\n- Add latent planner\n- Add decode-damage diagnostic\n')
    (outdir/'summary.md').write_text('\n'.join(lines))

def run_system(system,cfg,outdir):
    sdir=outdir/system; sdir.mkdir(parents=True,exist_ok=True)
    train=flatten_states(generate_dataset(system,cfg.n_train,cfg.grid_size,cfg.rollout_len,cfg.dt))
    val=flatten_states(generate_dataset(system,cfg.n_val,cfg.grid_size,cfg.rollout_len,cfg.dt))
    test=flatten_states(generate_dataset(system,cfg.n_test,cfg.grid_size,cfg.rollout_len,cfg.dt))
    ae=AutoEncoder(train.shape[-1],cfg.latent_dim,cfg.hidden_dim); dyn=LatentDynamics(cfg.latent_dim,cfg.hidden_dim)
    logs={}; logs.update(train_ae(ae,train,val,cfg)); logs.update(train_dyn(ae,dyn,train,val,cfg))
    torch.save(ae.state_dict(), sdir/'autoencoder.pt'); torch.save(dyn.state_dict(), sdir/'latent_dynamics.pt')
    plot_example(system,ae,dyn,test,cfg,sdir)
    return logs, evaluate(system,ae,dyn,test,cfg)

def parse_args():
    p=argparse.ArgumentParser(); p.add_argument('--outdir',type=str,default='/mnt/data/ashley_replication_outputs'); p.add_argument('--device',type=str,default='cpu'); p.add_argument('--seed',type=int,default=42)
    p.add_argument('--n-train',type=int,default=256); p.add_argument('--n-val',type=int,default=64); p.add_argument('--n-test',type=int,default=64); p.add_argument('--grid-size',type=int,default=64); p.add_argument('--rollout-len',type=int,default=48)
    p.add_argument('--latent-dim',type=int,default=16); p.add_argument('--hidden-dim',type=int,default=128); p.add_argument('--ae-epochs',type=int,default=10); p.add_argument('--dyn-epochs',type=int,default=15); p.add_argument('--batch-size',type=int,default=64); p.add_argument('--lr',type=float,default=1e-3)
    p.add_argument('--single-horizon',action='store_true'); p.add_argument('--systems',type=str,default='heat,wave'); a=p.parse_args()
    return Config(seed=a.seed,device=a.device,outdir=a.outdir,systems=tuple(s.strip() for s in a.systems.split(',') if s.strip()),n_train=a.n_train,n_val=a.n_val,n_test=a.n_test,grid_size=a.grid_size,rollout_len=a.rollout_len,latent_dim=a.latent_dim,hidden_dim=a.hidden_dim,ae_epochs=a.ae_epochs,dyn_epochs=a.dyn_epochs,batch_size=a.batch_size,lr=a.lr,multi_horizon=not a.single_horizon)

def main():
    cfg=parse_args(); set_seed(cfg.seed); outdir=Path(cfg.outdir); outdir.mkdir(parents=True,exist_ok=True)
    all_results=[]; logs={}; start=time.time()
    for system in cfg.systems:
        l, df = run_system(system,cfg,outdir); logs[system]=l; all_results.append(df)
    results=pd.concat(all_results,ignore_index=True); results.to_csv(outdir/'results.csv',index=False); plot_bars(results,outdir); write_summary(cfg,logs,results,outdir)
    (outdir/'run_meta.json').write_text(json.dumps({'seconds':time.time()-start,'systems':list(cfg.systems)},indent=2)); print(results.to_string(index=False)); print(f'\nSaved outputs to: {outdir}')

if __name__=='__main__':
    main()
