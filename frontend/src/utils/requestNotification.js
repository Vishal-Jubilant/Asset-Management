const normalizeName = (name) => String(name || '').toLowerCase().trim();

export const formatNotificationDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}-${month}-${year} | ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

export const getRequestNotificationDetails = (request, currentUser, requesterName) => {
  const history = request.commentsHistory || [];
  const currentStep = Number(request.currentStep || 1);
  const isRequester = String(request.requestedBy) === String(currentUser?.id);
  const isReturnedToRequester = request.status === 'Returned' && isRequester;
  const latestWorkflowEvent = [...history].reverse().find(comment =>
    ['approve', 'reject', 'return'].includes(comment.action)
  );
  const returnEvent = latestWorkflowEvent?.action === 'return' && (
    isReturnedToRequester ||
    normalizeName(latestWorkflowEvent.sentToStr) === normalizeName(currentUser?.name)
  ) ? latestWorkflowEvent : null;
  const latestHistoryEvent = history[history.length - 1];
  const editEvent = latestHistoryEvent?.action === 'edit' && currentStep === 1
    ? latestHistoryEvent
    : null;
  const approvalEvent = latestWorkflowEvent?.action === 'approve' && Number(latestWorkflowEvent.step) === currentStep - 1
    ? latestWorkflowEvent
    : null;
  const event = returnEvent || editEvent || approvalEvent;

  if (!event) {
    return {
      type: 'new',
      sender: requesterName,
      receivedAt: request.createdAt
    };
  }

  return {
    type: event.action === 'edit'
      ? 'updated'
      : isReturnedToRequester && event.action === 'return'
        ? 'returned'
        : 'forwarded',
    sender: event.name || requesterName,
    receivedAt: event.date || request.updatedAt || request.createdAt
  };
};