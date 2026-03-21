import React, { useMemo, useState } from "react";
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
}> = ({ securityProfiles, securityActiveProfileId }) => {
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editingDisplayName, setEditingDisplayName] = useState("");

  const profiles = useMemo(
    () => (Array.isArray(securityProfiles) ? securityProfiles : []),
    [securityProfiles]
  );

  return (
    <div className="px-4">
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
}))(ProfilesComponent);
