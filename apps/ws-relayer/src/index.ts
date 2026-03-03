import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8082 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === client.OPEN) {
        client.send(data.toString());
      }
    });
  });
});