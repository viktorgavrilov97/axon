"use client";

import { useState } from "react";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { UserDetailsModal } from "./UserDetailsModal";

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: Date;
  lastLogin: Date | null;
  balance?: number;
}

interface UsersTableProps {
  initialUsers: User[];
}

const roleLabels: Record<"USER" | "ADMIN" | "SUPERADMIN", string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};

function UserItem({ 
  user, 
  onDetailsClick
}: { 
  user: User; 
  onDetailsClick: (user: User) => void;
}) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };


  return (
    <tr 
      className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl"
      onClick={() => onDetailsClick(user)}
    >
      <td className="py-5 px-5 rounded-l-xl group-hover:px-6 transition-all duration-200 overflow-hidden">
        <div className="flex items-center gap-3">
          <UserAvatar
            user={{
              id: user.id,
              email: user.email,
              name: user.name,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              avatarColor: user.avatarColor,
            }}
            size={24}
          />
            <span className="text-body text-white-900">
              {getUserDisplayName(user)}
            </span>
          </div>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-600">{user.email}</span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-900">
          {roleLabels[user.role]}
        </span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-700 whitespace-nowrap">
        {formatDate(user.createdAt)}
        </span>
      </td>
      <td className="py-5 px-5 rounded-r-xl group-hover:px-6 text-right transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-900">
          {user.balance !== undefined ? `${user.balance.toFixed(2)} USDT` : "-"}
        </span>
      </td>
    </tr>
  );
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleRoleUpdated = (userId: string, newRole: "USER" | "ADMIN" | "SUPERADMIN") => {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
    // DON'T update selectedUser - let the modal manage its own state
    // This prevents the modal from re-rendering and overwriting selectedRole
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8">
            <p className="text-body text-white-600 text-center">
              No users yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">User</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Email</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Role</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Registered</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Balance</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserItem
                    key={user.id}
                    user={user}
                    onDetailsClick={setSelectedUser}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleUpdated={handleRoleUpdated}
        />
      )}
    </div>
  );
}

