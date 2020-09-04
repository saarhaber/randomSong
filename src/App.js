import React, { Component } from 'react';
import './App.css';
import Spotify from 'spotify-web-api-js';

const spotifyWebApi = new Spotify();

class App extends Component {
constructor(){
  super();
  const params = this.getHashParams()
  this.state = {
    loggedIn: params.access_token ? true : false,
    nowPlaying: {
      name: 'Play something before randomizing!',
      image: '',
      artist: ''
    },
    uris:[],
    markets :[
      "AD",
      "AR",
      "AT",
      "AU",
      "BE",
      "BG",
      "BO",
      "BR",
      "CA",
      "CH",
      "CL",
      "CO",
      "CR",
      "CY",
      "CZ",
      "DE",
      "DK",
      "DO",
      "EC",
      "EE",
      "ES",
      "FI",
      "FR",
      "GB",
      "GR",
      "GT",
      "HK",
      "HN",
      "HU",
      "ID",
      "IE",
      "IL",
      "IS",
      "IT",
      "JP",
      "LI",
      "LT",
      "LU",
      "LV",
      "MC",
      "MT",
      "MX",
      "MY",
      "NI",
      "NL",
      "NO",
      "NZ",
      "PA",
      "PE",
      "PH",
      "PL",
      "PT",
      "PY",
      "RO",
      "SE",
      "SG",
      "SK",
      "SV",
      "TH",
      "TR",
      "TW",
      "US",
      "UY",
      "VN",
      "ZA"
    ],
    currentMarket: "US"
   }
  if (params.access_token) {
    spotifyWebApi.setAccessToken(params.access_token)
  }
  
}


getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
     hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

getNowPlaying() {
 spotifyWebApi.getMyCurrentPlaybackState().then((response)=>{
   if (response.is_playing)
   {this.setState({
     nowPlaying: {
       name: response.item.name,
       image: response.item.album.images[0].url,
       artist: response.item.artists[0].name
     }
   })
 }
 else {
  this.setState({
    nowPlaying: {
      name: "Nothing is playing :("
    }
  })
 }
}
 )
}

getRandomSearch() {
  // A list of all characters that can be chosen.
  const characters = 'ﺍﺏﺕﺙﺝﺡﺥﺩﺫﺭﺯﺱﺵﺹﺽﻁﻅﻉﻍﻑﻕﻙﻝﻡﻥهـﻭﻱБВГДЖꙂꙀИЛѠЦЧШЩЪѢꙖѤЮѪѬѦѨѮѰѲѴҀňřšťůýÿžäëðöüăïîāņßķõőàèòùčēļșģìאבגדהוזחטיכלמנסעפצקרשתľơŕçởżğæœøåabcdefghijklmnñopqrstuvwxyz0123456789áéíóúαβγδεζηθικλμνξΟοΠπρςτυφχψωč';
  
  // Gets a random character from the characters string.
  const randomCharacter = characters.charAt(Math.floor(Math.random() * characters.length));
  let randomSearch = '';

  // Places the wildcard character at the beginning, or both beginning and end, randomly.
  switch (Math.round(Math.random())) {
    case 0:
      randomSearch = randomCharacter + '%';
      break;
    case 1:
      randomSearch = '%' + randomCharacter + '%';
      break;
  }
//console.log("charcater: ", randomSearch)
  return randomSearch;
}

async playNow () {
  this.setState({currentMarket: this.state.markets[Math.floor(Math.random() * 63)]})
  await spotifyWebApi.search(this.getRandomSearch(),['track'],{"market": this.state.currentMarket,"limit":50, "offset":Math.floor(Math.random() * 2000)})
  .then((response)=> { 
    this.setState({uris: response.tracks.items})
   })
   //console.log(this.state.uris)
  var numbersFromArr = Math.floor(Math.random() * 50)
  //console.log("number: ", numbersFromArr)
  
  setTimeout(spotifyWebApi.play({"uris": [this.state.uris[numbersFromArr].uri]}),1000)
  setTimeout(()=>{this.getNowPlaying()}, 1000)
  //console.log("market: " + this.state.currentMarket)
}

render (){
  
  return (
    <div className="App">
      <a href='http://localhost:8888'>
        <button >Login With Spotify</button>
      </a>
        <div id="title">{this.state.nowPlaying.name} <br></br>{this.state.nowPlaying.artist}</div>
        <div><img src= {this.state.nowPlaying.image} /> </div>
      <div>
      <button onClick={()=> this.playNow()}>
        Play Random Song
      </button>
      </div>
    </div>
  );
}
}

export default App;
