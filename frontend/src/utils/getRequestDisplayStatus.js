/**
 * Returns the display status for a request exactly as shown in the table badge.
 *
 * Logic (mirrors RequestTable.jsx):
 *   1. If the request is CURRENTLY pending with the current user → return the Pending status string.
 *   2. Else if the current user already took an action on someone else's request → return that action.
 *   3. Otherwise → return the raw r.status.
 *
 * @param {object} r           - The request object.
 * @param {object} currentUser - The logged-in user object.
 * @returns {string}
 */
export function getRequestDisplayStatus(r, currentUser) {
  if (!r) return '';

  const isMD =
    currentUser?.role?.toLowerCase() === 'md' ||
    currentUser?.departmentRole?.toLowerCase() === 'md';

  const roleName = isMD
    ? 'MD'
    : currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase()
    : '';

  // ── Step 1: Is this request currently waiting for ME to act? ──────────────
  let isCurrentlyPendingWithMe = false;

  if (r.status?.includes('Pending')) {
    if (r.approvalSequence?.length > 0) {
      const curStepIdx = (r.currentStep || 1) - 1;
      const curStep = r.approvalSequence[curStepIdx];
      if (curStep && curStep.status !== 'approved' && curStep.status !== 'rejected') {
        const isMDStep = curStep.role?.toLowerCase() === 'md' && isMD;
        isCurrentlyPendingWithMe =
          isMDStep ||
          (curStep.approvers || []).some((n) => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          });
      }
    } else if (
      r.status === `Pending with ${roleName}` ||
      (r.status === 'Pending with MD' && isMD)
    ) {
      if (!r.forwardedTo || r.forwardedTo.length === 0) {
        isCurrentlyPendingWithMe = true;
      } else {
        isCurrentlyPendingWithMe =
          (Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some((n) => {
            const nameStr = typeof n === 'object' ? n.value || n.label : String(n);
            return nameStr?.toLowerCase()?.trim() === currentUser?.name?.toLowerCase()?.trim();
          }) || (r.status === 'Pending with MD' && isMD);
      }
    }

    // If I already voted/handled it, it is no longer pending FOR ME
    if (r.handledBy?.includes(currentUser?.id)) {
      isCurrentlyPendingWithMe = false;
    }
  }

  // Currently awaiting my action → show the Pending status as-is
  if (isCurrentlyPendingWithMe) return r.status;

  // ── Step 2: Did I already take an action on someone else's request? ────────
  if (r.requestedBy !== currentUser?.id) {
    const myLastAction = [...(r.commentsHistory || [])]
      .reverse()
      .find(
        (c) =>
          (c.name || '').toLowerCase().trim() ===
            (currentUser?.name || '').toLowerCase().trim() &&
          ['approve', 'reject', 'return'].includes(c.action)
      );
    if (myLastAction) {
      if (myLastAction.action === 'approve') return 'Approved';
      if (myLastAction.action === 'reject') return 'Rejected';
      if (myLastAction.action === 'return') return 'Returned';
    }
  }

  // ── Step 3: Fallback to raw status ────────────────────────────────────────
  return r.status || '';
}
