const readlineSync = require('readline-sync');
const readline = require('readline');

const suitTable = {
  "Spade":String.fromCodePoint(0x2660),
  "Heart":String.fromCodePoint(0x2665),
  "Diamond":String.fromCodePoint(0x2666),
  "Club":String.fromCodePoint(0x2663),
}

//============レンダリング

// process.stdout.write(`Dealer's card:\n` + renderCard(this.hands) + "\n")
// process.stdout.write(`合計値 ${this.getSum()}\n`)
const calcLength = str => str.length + (str.match(/[^\x01-\x7E]/g) || []).length

const height = 8
const renderCard = (name, cards, sum, message=sum === 21 && cards.length === 2 ? "Black Jack!!" : "") => {
  let upper = "", middle = "", lower = ""
  for(const card of cards){
    upper  += "┏" + "━".repeat(card.mark.length === 4 ? 6 : 5) + "┓ "
    middle += "┃ " + card.mark + " ┃ "
    lower  += "┗" + "━".repeat(card.mark.length === 4 ? 6 : 5) + "┛ "
  }
  const cardWidth = Math.max(cards.reduce((sum, card) => sum + (card.mark.length === 4 ? 8 : 7),0) + cards.length + 1, 30, calcLength(message) + 4)
  console.log(cardWidth - upper.length - 1)
  const cardText = "┃ " + upper + " ".repeat(cardWidth - upper.length - 1) + "┃\n┃ " + middle + " ".repeat(cardWidth - upper.length - 1) + "┃\n┃ " + lower + " ".repeat(cardWidth - upper.length - 1) + "┃ "
  process.stdout.write(
`┏${"━".repeat(cardWidth)}┓
┃ ${name}:${" ".repeat(cardWidth - name.length - 2)}┃
${cardText}
┃ 合計値 ${sum}${" ".repeat(cardWidth - (""+sum).length - 8)}┃
┃ ${message}${" ".repeat(cardWidth - calcLength(message) - 2)} ┃
┗${"━".repeat(cardWidth)}┛`)
}

//===========ロジック
class Gambler{
  constructor(deck){
    this.deck = deck

    this.hands = []
    this.state = "none"
  }

  hit(num=1){
    if(num === 1){
      this.hands.push(this.deck.drawn())
    }else{
      this.hands = [...this.hands, ...this.deck.drawn(num)]
    }
  }

  getSum(){
    return this.hands.reduce((sum, card) => sum + card.value, 0)
  }

  burstCheck(){
    const isBurst = this.getSum() > 21
    if(!isBurst) return false
    const ace = this.hands.find(card => card instanceof AceCard && !card.lowered)
    if(ace != null){
      ace.lowerValue()
      return this.burstCheck()
    }else{
      return true
    }
  }

  clear(){
    this.hands = []
  }

  isBJ(){
    return this.getSum() === 21 && this.hands.length === 2
  }
}


class Dealer extends Gambler{
  get name(){return 'Dealer'}

  act(){
    this.state = "challenge"
    if(this.getSum() === 21){
      return
    }
    readline.cursorTo(process.stdout, 0, 0);
    renderCard(this.name, this.hands, this.getSum())
    while(this.getSum() <= 16){
      this.hit()
      const isBurst = this.burstCheck()
      readline.cursorTo(process.stdout, 0, 0);
      renderCard(this.name, this.hands, this.getSum())
      if(isBurst){
        this.state = "burst"
        readline.cursorTo(process.stdout, 0, 0);
        renderCard(this.name, this.hands, this.getSum(), "Dealerはバーストしました")
        break
      }
    }
  }
}

class Player extends Gambler{
  constructor(id, deck, playerNum){
    super(deck)
    this.id = id
    this.playerNum = playerNum
  }

  get name(){return 'Player' + (this.id + 1)}

  act(){
    while(true){
      readline.cursorTo(process.stdout, 0, height * (this.id + 1));
      renderCard(this.name, this.hands, this.getSum())
      if(this.getSum() === 21){
        this.state = "challenge"
        return
      }
      readline.cursorTo(process.stdout, 0, height * (this.playerNum + 1) + 1);
      if(readlineSync.question(`【${this.name}】hitしますか？[y/n] : `) === "y"){
        this.hit()
        const isBurst = this.burstCheck()
        if(isBurst){
          this.state = "burst"
          readline.cursorTo(process.stdout, 0, height * (this.id + 1));
          renderCard(this.name, this.hands, this.getSum(), `プレイヤー${this.id}はバーストしました`)
          break
        }
      }else{
        this.state = "challenge"
        break
      }
    }
    readline.cursorTo(process.stdout, 0, height * (this.id + 2) + 1);
    process.stdout.write(" ".repeat(process.stdout.columns))
  }

  end(result){
    readline.cursorTo(process.stdout, 0, height * (this.playerNum + 1) + 1 + this.id);
    process.stdout.write(`【${this.name}】You ${result}!`)
  }
}

const suits = ["Spade","Heart","Diamond","Club"]

class Deck{
  constructor(){
    this.cards = []
    for(const suit of suits){
      this.cards.push(new AceCard(suit, 1))
      for(let i = 2; i <= 13; i++){
        this.cards.push(new Card(suit, i))
      }
    }
  }

  drawn(num=1){
    const drawOne = () => {
      const drawnCard = this.cards[Math.floor(Math.random() * this.cards.length)]
      this.cards = this.cards.filter(card => card !== drawnCard)
      return drawnCard
    }

    if(num === 1) return drawOne()
    return Array(num).fill().map(_ => drawOne())
  }
}

class Card{
  constructor(suit, number){
    this.suit = suit
    this.number = number
  }

  get value(){
    return this.number >= 11 ? 10 : this.number
  }

  get mark(){
    return suitTable[this.suit] + " " + (this.number === 1 ? "A" : this.number === 11 ? "J" : this.number === 12 ? "Q" : this.number === 13 ? "K" : this.number)
  }
}

class AceCard extends Card{
  constructor(...arg){
    super(...arg)
    this.lowered = false
  }
  lowerValue(){
    this.lowered = true
  }
  get value(){
    return this.lowered ? 1 : 11
  }
}

class SecretCard extends Card{
  get size(){return 1}
  get mark(){return " ? "}
}

class Game{
  start(playerNum = 1){
    this.deck = new Deck()

    this.dealer = new Dealer(this.deck)
    this.players = Array(playerNum).fill().map((_, i) => new Player(i, this.deck, playerNum))

    process.stdout.write("\n".repeat(process.stdout.rows))
    readline.cursorTo(process.stdout, 0, 0);

  }

  play(){
    const {players, dealer} = this
    players.forEach(player => player.hit(2))
    dealer.hit(2)
    renderCard('Dealer', [dealer.hands[0], new SecretCard()], "?")

    players.forEach(player => player.act())

    const decidedPlayers = players.filter(player => player.state === "burst")
    decidedPlayers.forEach(player => player.end("lose"))

    if(decidedPlayers.length == players.length) return

    dealer.act()
    if(dealer.state === "burst"){
      players.filter(player => player.state === "challenge")
             .forEach(player => player.end("win"))
    }else if(dealer.state === "challenge"){
      players.forEach(player => {
        if(21 - dealer.getSum() < 21 - player.getSum()){
          player.end("lose")
        }else if(21 - dealer.getSum() > 21 - player.getSum()){
          player.end("win")
        }else{
          if(dealer.isBJ()){
            player.end("lose")
          }else if(player.isBJ()){
            player.end("win")
          }else{
            player.end("draw")
          }
        }
      })
    }
    readline.cursorTo(process.stdout, 0, process.stdout.rows - 1);
  }
}


const game = new Game()
game.start(2)
game.play()
;
