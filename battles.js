const Sim = require("pokemon-showdown");
const { parseBattle } = require("./battle-parser");
const Teams = Sim.Teams;

class Player {
  constructor(name, id, pid, team, socket) {
    this.name = name;
    this.id = id;
    this.pid = pid;
    this.socket = socket;
    this.team = Teams.pack(team);
  }
}

class SingleBattle {
  constructor(format, p1, p2, teams, secret) {
    this.createdOnO = new Date();
    this.createdOn = Tools.toTimestampString(this.createdOnO);


    this.secret = secret;
    this.id = ">battle-" + format + "-" + this.secret;

    this.inputLogs = [];
    this.outputLogs = [];
    this.spectatorLogs = [];
    this.p1log = [];
    this.p2log = [];

    this.users = {};
    this.guests = [];

    this.winner = null;

    this.isStarted = false;
    this.teams = teams;

    this.format = format;

    this.p1 = p1
      ? new Player(
          p1.name,
          p1.id,
          "p1",
          p1.team ? p1.team : Teams.generate(format)
        )
      : false;
    this.p2 = p2
      ? new Player(
          p1.name,
          p1.id,
          "p2",
          p2.team ? p2.team : Teams.generate(format)
        )
      : false;

    this.battleStream = new Sim.BattleStream();

    (async () => {
      for await (const output of this.battleStream) {
        // console.log(output + "\n\n");
        this.outputLogs.push(output);
        if(output.startsWith("|win|")) this.winner = output.split("|")[2];
        if(output.startsWith("end")) return;
        if (this.isStarted) {
          if (output.includes("sideupdate") || output.includes("update")) {
            parseBattle(output, this.p1, this.p2, this);
          } else {
            console.log("Output sent to players");
            this.p1log.push(`${this.id} \n ${output}`);
            this.p2log.push(`${this.id} \n ${output}`);
            this.spectatorLogs.push(`${this.id} \n ${output}`);

            this.broadcastAll(`${this.id} \n${output}`);
            this.p1.socket.send(`${this.id} \n ${output}`);
            this.p2.socket.send(`${this.id} \n ${output}`);
          }
          // this.p2.socket.send(`#${this.id} ${data[2]}`)
        }
      }
    })();
  }

  init() {
   
    if (!(this.p1 && this.p2)) return console.log("not all players are joined");
    this.p1.socket.send(
      `${this.id} \n|init|battle \n|title| ${this.p1.name} vs ${this.p2.name} \n|j|${this.p1.name} \n|j|${this.p2.name}`
    );
    this.p2.socket.send(
      `${this.id} \n|init|battle \n|title| ${this.p1.name} vs ${this.p2.name} \n|j|${this.p1.name} \n|j|${this.p2.name}`
    );
    let c = `${this.id} \n|init|battle \n|title| ${this.p1.name} vs ${this.p2.name} \n|j|${this.p1.name} \n|j|${this.p2.name}`;
    this.p1log.push(c);
    this.p2log.push(c);
    this.spectatorLogs.push(c);
    this.broadcastAll(c);
    this.write(`>start {"formatid":"${this.format}"}
>player p1 {"name":"${this.p1.name}","team":${JSON.stringify(this.p1.team)}}
>player p2 {"name":"${this.p2.name}","team":${JSON.stringify(this.p2.team)}}
`);
    this.isStarted = true;
    console.log("BATTLE STARTED");
  }

  write(data) {
    this.inputLogs.push(data);
    this.battleStream.write(data);
  }

  isPlayer(id) {
    if (this.p1.id == id || this.p2.id == id) return true;
    return false;
  }

  logAll(msg) {
    let id = this.id;
    this.p1log.push(id + "\n" + msg);
    this.p2log.push(id + "\n" + msg);
    this.spectatorLogs.push(id + "\n" + msg);
  }

  sendAllExcept(msg,p1,p2) {
    if(!msg.startsWith(">battle")) msg = this.id + "\n" + msg;
    this.logAll(msg);
    if(this.p1) this.p1.socket.send(msg);
    if(this.p2) this.p2.socket.send(msg);
    this.broadcastAll(msg);
  }

  addPlayer(p,team) {
     console.log("Adding Player " + p.name);
    let id = Tools.random(2) + 1;

    if (this.p1) {
      console.log("SOCKET CHANGE IN P1");
      if (this.p1.id == p.id) this.p1.socket = p.socket;
    }

    if (this.p2) {
      console.log("SOCKET CHANGE IN P2");
      if (this.p2.id == p.id) this.p2.socket = p.socket;
    }

    if (!this.p1) {
   
        this.p1 = new Player(
          p.name,
          p.id,
          "p1",
          team ? team : ( this.teams ? this.teams[0] : false ),
          p.socket
        );
    }
 
    else if (this.p1 && !this.p2)
     {
      if (this.p1.id == p.id) return;
        this.p2 = new Player(
          p.name,
          p.id,
          "p2",
          team ? team : (this.teams ? this.teams[1] : false),
          p.socket
        );
      }
    
  
    if (this.p1.id == this.p2.id) delete this.p2;
    if(this.p1 && this.p2) {
      if(this.p1.id != p.id && this.p2.id != p.id) return "spect";
    }
  }

  hasPlayer(id) {
    console.log("ID : " + id);
    if (this.p1.id == id) return "p1";
    if (this.p2.id == id) return "p2";
    return false;
  }

  broadcastAll(msg) {
    if (!this.users || !Object.keys(this.users).length) return;
    console.log("TeSt");
    for (let user in this.users) {
     // console.log(this.users[user]);
      if (this.users[user]) this.users[user].socket.send(msg);
    }
    this.guests.forEach((ws) => {
      ws.send(msg);
    });
  }

  forfeit(user) {
    let c = `${this.id} \n|c|BATTLE|*${user.name} forfeitted the battle*`;
    this.logAll(c);
    this.broadcastAll(c);
    this.p1.socket.send(c);
    this.p2.socket.send(c);
    if (this.p1.id == user.id) {
      this.winner = this.p2.name;
      this.write(">forcewin p2");
    } else {
      this.winner = this.p1.name;
      this.write(">forcewin p1");
    }
  }

  makeMove(by, data) {

    //  this.inputLogs.push(`>${by} ${data}`)
    if (this.p1.id == by.id) {
      this.write(`>p1 ${data.replace("/", "")}`);
    }
    if (this.p2.id == by.id) {
      this.write(`>p2 ${data.replace("/", "")}`);
    }
  }
}

exports.SingleBattle = SingleBattle;
