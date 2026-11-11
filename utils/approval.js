// Bill approval rules. A saloon appoints a default approver and may override it
// for single days; a bill is approved by the approver of its service day.
// The owner may review any bill; a manager any bill but their own; the day's
// approver only pending bills of that day that someone else made.
const { safeTz, dayStr } = require('./time');

const same = (a, b) => a != null && b != null && String(a) === String(b);

// Approver id for a saloon-local day, or null. `activeIds` (a Set of id strings)
// drops staff who were deactivated or deleted after being appointed.
function approverFor(cfg, day, activeIds) {
  const override = (cfg?.days || []).find(d => d.day === day);
  const id = override ? override.staff : cfg?.defaultApprover;
  if (!id) return null;
  return !activeIds || activeIds.has(String(id)) ? String(id) : null;
}

const billDay = (entry, tz) => dayStr(safeTz(tz), new Date(entry.serviceDate));

// Why `staff` may not review `entry` right now, or null when they may.
// `approverId` is the approver of the bill's day (approverFor).
function reviewError(staff, entry, approverId, { enabled }) {
  if (!entry.approval?.status) return 'This bill does not need approval.';
  if (staff.role === 'owner') return null;
  if (same(entry.staff, staff._id)) return 'You cannot approve your own bill. The owner or a manager will review it.';
  if (staff.role === 'manager') return null;
  if (!enabled) return 'Bill approval is turned off.';
  if (!same(approverId, staff._id)) return 'Only the approver appointed for that day can review this bill.';
  if (entry.approval.status !== 'pending') return 'This bill has already been reviewed. Ask the owner or a manager to change it.';
  return null;
}

module.exports = { approverFor, billDay, reviewError, same };
