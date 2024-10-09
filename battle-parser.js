exports.parseBattle = (data, p1, p2, battle) => {
  let output = data;
  if (data.startsWith("sideupdate")) {
    let options = data.split("\n");
    let player = options[1];
 

    switch (player) {
      case "p1":
        {
          battle.p1log.push(`${battle.id} \n${options[2]}`);

          p1.socket.send(`${battle.id} \n${options[2]}`);
        }
        break;

      case "p2":
        {
          battle.p2log.push(`${battle.id} \n${options[2]}`);
          p2.socket.send(`${battle.id} \n${options[2]}`);
        }
        break;

      default:
        {
          throw new Error("Invalid Choice");
        }
        break;
    }
  } else if (output.startsWith("update")) {
    let data = output.split("\n");

    let p1log = [];
    let p2log = [];
    let slog = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] == "|split|p1") {
        p1log.push(data[i + 1]);
        p2log.push(data[i + 2]);
        slog.push(data[i + 2]);

        i = i + 2;
      } else if (data[i] == "|split|p2") {
        p1log.push(data[i + 2]);
        p2log.push(data[i + 1]);
        slog.push(data[i + 2]);
        i = i + 2;
      } else {
        p1log.push(data[i]);
        p2log.push(data[i]);
        slog.push(data[i]);
      }
    }
    

    battle.spectatorLogs.push(`${battle.id} \n${slog.join("\n")}`);
    battle.broadcastAll(`${battle.id} \n${slog.join("\n")}`);
    battle.p1log.push(`${battle.id} \n${p1log.join("\n")}`);
    battle.p2log.push(`${battle.id} \n${p2log.join("\n")}`);
    p1.socket.send(`${battle.id} \n${p1log.join("\n")}`);
    p2.socket.send(`${battle.id} \n${p2log.join("\n")}`);
  }
};

