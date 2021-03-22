const net = require("net");

const profileController = require("./controllers/profile.controller");
const orderController = require("./controllers/order.controller");
const itemController = require("./controllers/item.controller");

const createTable = require("./utils/createTable");

let menu = require('./data/menu.json');

function isAdmin(socket) {
  return adminSockets.includes(socket);
}

let adminSockets = [];

function connectionListener(socket) {
  socket.on("data", function (data) {
    const request = data.toString().trim();
    const args = request.split(" ");

    const command = args[0].toLowerCase();

    let eventResponse;

    switch (command) {
      case "profile":
        eventResponse = profileController(args);
        if (eventResponse.error) {
          socket.write(eventResponse.response);
          break;
        }
        adminSockets.push(socket);
        socket.write(eventResponse.response);
        break;
      case "show":
        let showItem = args[1];
        if (!showItem) {
          socket.write("Comando SHOW: forneça um argumento 'item'.");
          break;
        }
        showItem = showItem.toLowerCase();
        switch (showItem) {
          case 'pedido':
            if (args[2]) {
              eventResponse = orderController.show(args[2]);
              if (eventResponse.error) {
                socket.write(eventResponse.response);
              } else {
                socket.write(
                  createTable(
                    ['#', 'Item', 'Quan.', 'Total (R$)'],
                    eventResponse.data.items.map((v, i) => [
                      (i + 1).toString(),
                      menu.items[v.itemId].name,
                      v.amount.toString(),
                      (menu.items[v.itemId].price_br * v.amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRA",
                      })
                    ])
                  )
                  + `Total (R$): ${eventResponse.data.items.reduce((prev, curr) => prev + (curr.amount * menu.items[curr.itemId].price_br), 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRA",
                  })}`
                );
              }
              break;
            }

            eventResponse = orderController.show();
            if (eventResponse.error) {
              socket.write(eventResponse.response);
              break;
            }

            socket.write(
              createTable(
                ['#', 'Item', 'Quan.', 'Total (R$)'],
                eventResponse.data.items.map((v, i) => [
                  (i + 1).toString(),
                  menu.items[v.itemId].name,
                  v.amount.toString(),
                  (menu.items[v.itemId].price_br * v.amount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRA",
                  })
                ])
              )
              + `Total (R$): ${eventResponse.data.items.reduce((prev, curr) => prev + (curr.amount * menu.items[curr.itemId].price_br), 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRA",
              })}`
            );
            break;
          case 'pedidos':
            eventResponse = orderController.index();
            socket.write(
              createTable(
                ['#', 'Total (R$)'],
                eventResponse.data.map((v, i) => [
                  (i + 1).toString(),
                  v.items.reduce((prev, curr) => prev + (curr.amount * menu.items[curr.itemId].price_br), 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRA",
                  })
                ])
              )
            );
            break;
          case 'cardapio':
            socket.write(
              createTable(
                ['#', 'Item', 'Preço (R$)'],
                menu.items.map((v, i) => [(i + 1).toString(), v.name, v.price_br.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRA",
                })])
              )
            );
            break;
          default:
            socket.write(`Comando SHOW: argumento ${showItem} não faz parte do protocolo SDP.`);
        }
        break;
      case "add":
        let addItem = args[1];
        if (!addItem) {
          socket.write("Comando ADD: forneça um argumento 'item'.");
          break;
        }
        addItem = addItem.toLowerCase();
        switch (addItem) {
          case 'item':
            eventResponse = orderController.update(args, menu);
            if (eventResponse.error) {
              socket.write(eventResponse.response);
              break;
            }
            break;
          default:
            socket.write(`Comando ADD: argumento ${addItem} não faz parte do protocolo SDP.`);
        }
        break;
      case "delete":
        if (!isAdmin(socket)) {
          socket.write(`Comando DELETE: Não autorizado. Utilize o comando PROFILE para entrar como um administrador`);
          break;
        }
        let deleteItem = args[1];
        if (!deleteItem) {
          socket.write("Comando DELETE: forneça um argumento 'item'.");
          break;
        }
        deleteItem = deleteItem.toLowerCase();
        switch (deleteItem) {
          case 'item':
            // Deletar pedidos com aquele item
            orderController.delete(args);
            
            // Deletar item do menu
            eventResponse = itemController.delete(args, menu);
            if (eventResponse.error) {
              socket.write(eventResponse.response);
              break;
            }
            socket.write("OBS: Todos os pedidos contendo este item foram deletados.");
            socket.write(eventResponse.response);
            break;
          default:
            socket.write(`Comando ADD: argumento ${addItem} não faz parte do protocolo SDP.`);
        }
        break;
      case "create":
        let createItem = args[1];
        if (!createItem) {
          socket.write("Comando CREATE: forneça um argumento 'item'.");
          break;
        }
        createItem = createItem.toLowerCase();
        switch (createItem) {
          case 'pedido':
            eventResponse = orderController.prepare();
            socket.write(eventResponse.response);
            break;
          case 'item':
            if (!isAdmin(socket)) {
              socket.write(`Comando CREATE: Não autorizado. Utilize o comando PROFILE para entrar como um administrador`);
              break;
            }
            eventResponse = itemController.store(args, menu);
            if (eventResponse.error) {
              socket.write(eventResponse.response);
              break;
            }

            menu.items.push(eventResponse.data);
            socket.write(`Item #${menu.items.length} criado com sucesso.`);
            break;
          default:
            socket.write(`Comando CREATE: argumento ${createItem} não faz parte do protocolo SDP.`);
        }
        break;
      case "finish":
        let finishItem = args[1];
        if (!finishItem) {
          socket.write("Comando FINISH: forneça um argumento 'item'.");
          break;
        }
        switch (finishItem) {
          case 'pedido':
            eventResponse = orderController.store(menu);
            if (eventResponse.error) {
              socket.write(eventResponse.response);
              break;
            }
            socket.write(eventResponse.response);
            break;
          default:
            socket.write(`Comando FINISH: argumento ${finishItem} não faz parte do protocolo SDP.`);
        }
        break;
      case "exit":
        socket.end();
        break;
      default:
        socket.write(`Comando '${command}' não faz parte do protocolo SDP.`);
    }
  });
}

const server = net.createServer(connectionListener);

server.listen(3333, "0.0.0.0", function () {
  console.log("Server is running at " + 3333);
});