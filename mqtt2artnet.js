const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://10.10.0.12");
//const artnet = require("artnet")({ host: "10.10.0.91" });

const dmxlib = require("dmxnet");
const dmxnet = new dmxlib.dmxnet({
  verbose: 0,
  oem: 0,
  sName: "dmxnet Monitor",
  lName: ""
});
const receiver = dmxnet.newReceiver({ subnet: 0, universe: 0, net: 0 });
const sender = dmxnet.newSender({
  ip: "255.255.255.255",
  subnet: 0, //Destination subnet, default 0
  universe: 0, //Destination universe, default 0
  net: 0, //Destination net, default 0
  port: 6454, //Destination UDP Port, default 6454
  base_refresh_interval: 5000 // Default interval for sending unchanged ArtDmx
});

var dmx = [];
for (var i = 0; i < 512; i++) {
  dmx[i] = {};
}

receiver.on("data", data => {
  //console.log("REC: " + data);
  for (var i = 0; i < 512; i++) {
    dmx[i].value = data[i];
  }
  console.log("DMX: " + JSON.stringify(dmx));
});

console.log("connecting");

client.on("connect", () => {
  client.subscribe("/Artnet/#");
  console.log("connect");
});

client.on("message", (topic, message) => {
  const data = message.toString("utf8");
  //console.log("msg:");
  //console.log(topic + " " + data);
  const topicitems = topic.split("/");
  //console.log(topicitems);
  var cmd = topicitems[topicitems.length - 1];
  const channel = topicitems[2];
  if (cmd === channel) {
    cmd = "value";
    sender.prepChannel(channel, data);
  }
  console.log(channel + ": " + cmd + " " + data);

  dmx[channel][cmd] = data;
});

setInterval(() => {
  dmx.forEach((task, channel) => {
    if ("target" in task && task.target <= 255 && task.target >= 0) {
      const target = Number(task.target);
      if ("value" in task && "dimspeed" in task) {
        var value = 0;
        if ("realvalue" in task) {
          value = Number(task.realvalue);
        } else {
          value = Number(task.value);
        }
        const dimstep = 2560 / Number(task.dimspeed);
        var setvalue = value;
        if (target > value) {
          setvalue = 0.0 + value + dimstep;
          if (setvalue > target) {
            setvalue = target;
            delete task.target;
          }
        } else {
          setvalue = 0.0 + value - dimstep;
          if (setvalue < target) {
            setvalue = target;
            delete task.target;
          }
        }
        task.realvalue = setvalue;
        sender.prepChannel(channel, Math.round(setvalue));
      } else {
        sender.prepChannel(channel, target);
        delete task.target;
      }
    }
  });
  sender.transmit();
}, 10);
