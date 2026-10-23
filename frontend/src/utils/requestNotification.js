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
  const latestReturnEvent = [...history].reverse().find(comment => comment.action === 'return');
  const latestWorkflowEvent = [...history].reverse().find(comment =>
    ['approve', 'reject', 'return'].includes(comment.action)
  );
  const latestReturnReply = latestReturnEvent?.replies?.at(-1);
  const replyIsLatestEvent = latestReturnReply &&
    new Date(latestReturnReply.date).getTime() >= new Date(latestWorkflowEvent?.date || 0).getTime();
  const replyEvent = request.status?.includes('Pending') &&
    normalizeName(latestReturnEvent?.name) === normalizeName(currentUser?.name) &&
    replyIsLatestEvent
    ? latestReturnReply
    : null;
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
  const event = replyEvent || returnEvent || editEvent || approvalEvent;

  if (!event) {
    return {
      type: 'new',
      sender: requesterName,
      receivedAt: request.createdAt
    };
  }

  return {
    type: replyEvent
      ? 'reply'
      : event.action === 'return'
        ? 'returned'
        : event.action === 'edit' ? 'updated' : 'forwarded',
    sender: replyEvent?.name || event.name || requesterName,
    receivedAt: event.date || request.updatedAt || request.createdAt
  };
};