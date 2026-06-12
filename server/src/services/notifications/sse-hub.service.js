const connections = new Map();

const writeEvent = (stream, event, payload) => {
  stream.write(`event: ${event}\n`);
  stream.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const addSseConnection = (userId, stream) => {
  const key = String(userId);
  const userConnections = connections.get(key) || new Set();
  userConnections.add(stream);
  connections.set(key, userConnections);

  stream.write(': connected\n\n');

  const keepAlive = setInterval(() => {
    stream.write(': ping\n\n');
  }, 25000);

  return () => {
    clearInterval(keepAlive);
    userConnections.delete(stream);
    if (userConnections.size === 0) {
      connections.delete(key);
    }
  };
};

export const pushToUser = (userId, event, payload) => {
  const userConnections = connections.get(String(userId));
  if (!userConnections) return;

  for (const stream of userConnections) {
    writeEvent(stream, event, payload);
  }
};

export const broadcastToOnlineUsers = (event, payload) => {
  let connectionCount = 0;
  let userCount = 0;

  for (const userConnections of connections.values()) {
    userCount += 1;
    for (const stream of userConnections) {
      connectionCount += 1;
      writeEvent(stream, event, payload);
    }
  }

  return { userCount, connectionCount };
};
