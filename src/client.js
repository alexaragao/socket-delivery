var readline = require("readline");
var net = require("net");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var client = net.Socket();

function connectionListener() {
  client.on("data", function (data) {
    // data is by default a array of bytes. You need to cast it into a string.
    const response = data.toString();

    console.log(response);
  });
  
  rl.on('line', line => {
    client.write(line + "\n");

    if (line === "exit") {
      client.write("exit\n");
      client.end();
      rl.close();
    }
  });
}

client.connect(3333, "0.0.0.0", connectionListener);