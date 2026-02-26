import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listUsers, listRoles, createUser } from '../api/users';
import type { User, Role } from '../api/users';
import { UserTable } from '../components/UserTable';
import { Pagination } from '../components/Pagination';
import { ApiError } from '../api/client';

export function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState({ limit: 20, offset: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.roles.includes('admin');

  const fetchUsers = useCallback(
    (offset = 0) => {
      if (!token) return;
      setLoading(true);
      listUsers(token, { offset, limit: 20, order: 'desc' })
        .then((res) => {
          setUsers(res.data ?? []);
          setMeta(res.meta ?? { limit: 20, offset: 0, count: 0 });
        })
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    fetchUsers(0);
  }, [fetchUsers]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    listRoles(token)
      .then((res) => setRoles(res.data ?? []))
      .catch(() => setRoles([]));
  }, [token, isAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await createUser(token, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roleId: formData.roleId || undefined,
      });
      setFormData({ name: '', email: '', password: '', roleId: '' });
      setShowForm(false);
      fetchUsers(0);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Failed to create user'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-amber-800">
        You need admin permissions to access this page.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Users</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
        >
          {showForm ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateUser}
          className="mb-6 max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((p) => ({ ...p, password: e.target.value }))
              }
              required
              minLength={6}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              value={formData.roleId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, roleId: e.target.value }))
              }
              className="w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          {formError && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <>
          <UserTable users={users} />
          <div className="mt-4 rounded-lg border border-slate-200 bg-white">
            <Pagination
              offset={meta.offset}
              limit={meta.limit}
              count={meta.count}
              onPageChange={(o) => fetchUsers(o)}
            />
          </div>
        </>
      )}
    </div>
  );
}
