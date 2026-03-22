import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { shell } from "../../shell";

interface SecurityProfile {
  id: string;
  displayName: string;
  status: string;
  role: string;
  isActive: boolean;
  enrolledAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
}

const ProfilesComponent: React.FC<{
  securityProfiles: SecurityProfile[];
  securityActiveProfileId: string;
  securityProfilesLastAction: string;
  securityProfilesLastError: string;
  securityPasskeyBootstrapBlocked: boolean;
}> = ({
  securityProfiles,
  securityActiveProfileId,
  securityProfilesLastAction,
  securityProfilesLastError,
  securityPasskeyBootstrapBlocked,
}) => {
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editingDisplayName, setEditingDisplayName] = useState("");

  const profiles = useMemo(
    () => (Array.isArray(securityProfiles) ? securityProfiles : []),
    [securityProfiles]
  );

  useEffect(() => {
    shell.send("securityListProfiles");
  }, []);

  return (
    <div className="px-4">
      {securityProfilesLastError ? (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 mb-3 text-xs text-red-200">
          Profile operation failed: {securityProfilesLastError}
        </div>
      ) : null}
      {securityProfilesLastAction ? (
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3 mb-3 text-xs text-cyan-100">
          Last profile action: {securityProfilesLastAction}
        </div>
      ) : null}
      {securityPasskeyBootstrapBlocked ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 mb-3 text-xs text-amber-100">
          Runtime is currently locked by passkey bootstrap requirements. Profile controls are still visible, but listening and
          executable command paths will remain blocked until bootstrap is satisfied.
        </div>
      ) : null}

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2">Profiles</h2>
        <div className="text-xs text-white/70">Profiles loaded: {profiles.length}</div>
        <div className="text-xs text-white/70">
          Active profile: {profiles.find((p) => p.id === securityActiveProfileId)?.displayName || "none"}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">Create profile</h3>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 py-1"
            value={newDisplayName}
            placeholder="Display name"
            onChange={(e) => setNewDisplayName(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs uppercase tracking-widest"
            onClick={() => {
              shell.send("securityCreateProfile", newDisplayName);
              setNewDisplayName("");
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {profiles.map((profile) => {
          const isActive = profile.id === securityActiveProfileId;
          const isEditing = editingProfileId === profile.id;
          return (
            <div key={profile.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white/90">
                    {profile.displayName}{" "}
                    {isActive ? (
                      <span className="ml-1 text-[10px] uppercase tracking-widest text-cyan-300">Active</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-white/60">ID: {profile.id}</div>
                  <div className="text-[11px] text-white/60">
                    Role: {profile.role} | Status: {profile.status}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    className="px-2 py-1 rounded border border-white/20 text-white/80 text-[10px] uppercase tracking-widest"
                    onClick={() => shell.send("securitySwitchProfile", profile.id)}
                    disabled={isActive}
                  >
                    Switch
                  </button>
                  {profile.status !== "suspended" ? (
                    <button
                      className="px-2 py-1 rounded border border-yellow-400/40 text-yellow-200 text-[10px] uppercase tracking-widest"
                      onClick={() =>
                        shell.send("securityUpdateProfile", profile.id, {
                          status: "suspended",
                        })
                      }
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 rounded border border-emerald-400/40 text-emerald-200 text-[10px] uppercase tracking-widest"
                      onClick={() =>
                        shell.send("securityUpdateProfile", profile.id, {
                          status: "active",
                        })
                      }
                    >
                      Activate
                    </button>
                  )}
                  {profile.status !== "revoked" ? (
                    <button
                      className="px-2 py-1 rounded border border-red-400/40 text-red-200 text-[10px] uppercase tracking-widest"
                      onClick={() =>
                        shell.send("securityUpdateProfile", profile.id, {
                          status: "revoked",
                        })
                      }
                    >
                      Revoke
                    </button>
                  ) : null}
                  <button
                    className="px-2 py-1 rounded border border-cyan-400/40 text-cyan-200 text-[10px] uppercase tracking-widest"
                    onClick={() => shell.send("securityReEnrollProfile", profile.id)}
                  >
                    Re-enroll
                  </button>
                  <button
                    className="px-2 py-1 rounded border border-white/20 text-white/80 text-[10px] uppercase tracking-widest"
                    onClick={() => {
                      setEditingProfileId(profile.id);
                      setEditingDisplayName(profile.displayName);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="px-2 py-1 rounded border border-red-400/40 text-red-200 text-[10px] uppercase tracking-widest disabled:opacity-40"
                    onClick={() => shell.send("securityDeleteProfile", profile.id)}
                    disabled={isActive}
                    title={isActive ? "Switch profiles before deleting this one." : "Delete profile"}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {isEditing ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="input flex-1 py-1"
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                  />
                  <button
                    className="px-2 py-1 rounded border border-cyan-400/40 text-cyan-200 text-[10px] uppercase tracking-widest"
                    onClick={() => {
                      shell.send("securityUpdateProfile", profile.id, {
                        displayName: editingDisplayName,
                      });
                      setEditingProfileId("");
                      setEditingDisplayName("");
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="px-2 py-1 rounded border border-white/20 text-white/80 text-[10px] uppercase tracking-widest"
                    onClick={() => {
                      setEditingProfileId("");
                      setEditingDisplayName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Profiles = connect((state: any) => ({
  securityProfiles: state.securityProfiles,
  securityActiveProfileId: state.securityActiveProfileId,
  securityProfilesLastAction: state.securityProfilesLastAction,
  securityProfilesLastError: state.securityProfilesLastError,
  securityPasskeyBootstrapBlocked: !!state.securityPasskeyBootstrapBlocked,
}))(ProfilesComponent);
