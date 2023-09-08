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
      name: '',
      image: 'https://images.squarespace-cdn.com/content/v1/585e12abe4fcb5ea1248900e/1521163355433-O0YP7FRVMXHTCHB1O4CU/ke17ZwdGBToddI8pDm48kPx25wW2-RVvoRgxIT6HShBZw-zPPgdn4jUwVcJE1ZvWQUxwkmyExglNqGp0IvTJZUJFbgE-7XRK3dMEBRBhUpx0Qh3eD5PfZ_nDR0M7OIGaTx-0Okj4hzQeRKYKbt7WfTYFScRKDTW78PcnUqBGqX8/Spotify+Square.png',
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
    currentMarket: "US",
    loggedInText: "Login With Spotify",
    userImg: "",
    // playingNow: false
   }
  if (params.access_token) {
    spotifyWebApi.setAccessToken(params.access_token)

  //   spotifyWebApi.getMyCurrentPlaybackState(params.access_token).then((response)=>{
  //     this.setState({playingNow: response.is_playing})
  // })

    spotifyWebApi.getMe(params.access_token).then((response)=> {
      this.setState({loggedInText: response.display_name, userImg: response.images[0].url})
    })

    spotifyWebApi.getMyCurrentPlaybackState(params.access_token).then((response)=>{
      if (response.is_playing)
      {this.setState({
        nowPlaying: {
          name: response.item.name,
          image: response.item.album.images[0].url,
          artist: response.item.artists[0].name
        },
        // playingNow: true
      })
    }
    else {

      spotifyWebApi.getMyRecentlyPlayedTracks(params.access_token).then((response)=> {
        spotifyWebApi.getTrack(response.items[0].track.uri.substring(14,)).then((response)=> {
         this.setState({
           nowPlaying: {
             name: response.name,
             image: response.album.images[0].url,
             artist: response.album.artists[0].name
           }
         })
        })
       })

    }
   })


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
    default:
      randomSearch = randomCharacter;
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
  var numbersFromArr = Math.floor(Math.random() * 50)
  
  setTimeout(spotifyWebApi.play({"uris": [this.state.uris[numbersFromArr].uri]}),1000)
  setTimeout(()=>{this.getNowPlaying()}, 1000)
}


componentDidMount() {
  const token = localStorage.getItem('spotify_access_token');
  if (token) {
    this.setState({ loggedIn: true });
    spotifyWebApi.setAccessToken(token);
  var checkDevice = false
    spotifyWebApi.getMyCurrentPlaybackState().then((response)=>{
    
      spotifyWebApi.getMyDevices().then((response)=> {
      for (var i = 0; i < response.devices.length; i++) {
        if (response.devices[i].is_active) {
          checkDevice = true;
        }
      }
      if (checkDevice && !response.is_playing) {
        this.playNow()
      }
      else {
        alert ("Open Spotify on a device and play a song first")
      }
  })
    
}) 
  }
}

render (){
  
  return (
    <div className="App">
        <a href='https://calm-waters-54337-58e8a442a9e9.herokuapp.com/login/'>
          <button >  {this.state.loggedIn ? "Logged in as: " + this.state.loggedInText : "Login With Spotify"} <img id="userid" alt='userid' src={this.state.userImg}/>
        </button>
      </a>
        <div id="title">{this.state.nowPlaying.name} <br></br>{this.state.nowPlaying.artist}</div>
        <div><img id="imgplay" alt='song title' src= {this.state.nowPlaying.image} /> </div>
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

