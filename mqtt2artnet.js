const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://10.10.0.12");
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
  for (var i = 0; i < 512; i++) {
    if ("value" in dmx[i]) {
      if (dmx[i].value != data[i]) {
        client.publish("/Artnet/" + i, data[i].toString());
      }
    } else {
      client.publish("/Artnet/" + i, data[i].toString());
    }
    dmx[i].value = data[i];
    if ("realvalue" in dmx[i]) {
      if (dmx[i].realvalue == data[i]) delete dmx[i].realvalue;
    }
    if (data[i] != 0) {
      console.log("DMX" + i + JSON.stringify(dmx[i]));
    }
  }
});

client.on("connect", () => {
  client.subscribe("/Artnet/#");
});

client.on("message", (topic, message) => {
  console.log("mqtt: " + topic + ": " + message);
  const data = message.toString("utf8");
  const topicitems = topic.split("/");
  var cmd = topicitems[topicitems.length - 1];
  const channel = topicitems[2];
  if (cmd === channel) {
    cmd = "target";
  }
  dmx[channel][cmd] = data;
});

setInterval(() => {
  var sendneeded = false;
  dmx.forEach((task, channel) => {
    if ("target" in task && task.target <= 255 && task.target >= 0) {
      const target = Number(task.target);
      if ("dimspeed" in task) {
        var value = target;
        if ("value" in task) {
          value = Number(task.value);
        }
        if ("realvalue" in task) {
          value = Number(task.realvalue);
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
        sendneeded = true;
      } else {
        sender.prepChannel(channel, target);
        sendneeded = true;
        delete task.target;
      }
    } else if ("value" in task) {
      sender.prepChannel(channel, task.value);
    }
  });
  if (sendneeded) sender.transmit();
}, 10);
