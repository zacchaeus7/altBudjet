let onUnauthenticated = null;

export const setUnauthenticatedHandler = (handler) => {
  onUnauthenticated = handler;
};

export const triggerUnauthenticated = async () => {
  if (typeof onUnauthenticated !== 'function') {
    return;
  }

  await onUnauthenticated();
};
