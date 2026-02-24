export type Edition = 'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film'

type QuizQuestion = {
  q: string
  answers: string[]
  correct: number
}

export const quizQuestions: Record<Edition, QuizQuestion[]> = {
  fussball: [
    {
      q: 'Wie viele Spieler stehen pro Team gleichzeitig auf dem Fußballfeld?',
      answers: ['9', '10', '11', '12'],
      correct: 2
    },
    {
      q: 'In welchem Land fand die erste Fußball-Weltmeisterschaft 1930 statt?',
      answers: ['Brasilien', 'Uruguay', 'Deutschland', 'Italien'],
      correct: 1
    },
    {
      q: 'Wie lange dauert ein reguläres Fußballspiel ohne Verlängerung?',
      answers: ['70 Minuten', '80 Minuten', '90 Minuten', '100 Minuten'],
      correct: 2
    },
    {
      q: 'Wie viele Minuten dauert eine Halbzeit im Profifußball?',
      answers: ['30 Minuten', '35 Minuten', '45 Minuten', '50 Minuten'],
      correct: 2
    },
    {
      q: 'Welche Farbe hat normalerweise die Karte für einen Platzverweis?',
      answers: ['Gelb', 'Rot', 'Blau', 'Grün'],
      correct: 1
    },
    {
      q: 'Wie nennt man drei Tore eines Spielers in einem Spiel?',
      answers: ['Triple', 'Hattrick', 'Dreierpack', 'Super-Tor'],
      correct: 1
    },
    {
      q: 'Wie groß ist ein reguläres Fußballteam im Kader (auf dem Feld)?',
      answers: ['9 Spieler', '10 Spieler', '11 Spieler', '12 Spieler'],
      correct: 2
    },
    {
      q: "Welcher Spieler hat die meisten Ballon-d'Or Titel gewonnen?",
      answers: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'],
      correct: 1
    },
    {
      q: 'Was passiert bei einem Abseits?',
      answers: ['Eckball', 'Freistoß für die Gegner', 'Einwurf', 'Strafstoß'],
      correct: 1
    },
    {
      q: 'Wie viele Punkte bekommt ein Team für einen Sieg?',
      answers: ['1 Punkt', '2 Punkte', '3 Punkte', '4 Punkte'],
      correct: 2
    }
  ],
  wissen: [
    {
      q: 'Wie viele Kontinente gibt es auf der Erde?',
      answers: ['5', '6', '7', '8'],
      correct: 2
    },
    {
      q: 'Welcher Planet ist der Sonne am nächsten?',
      answers: ['Venus', 'Merkur', 'Mars', 'Erde'],
      correct: 1
    },
    {
      q: 'Wie viele Tage hat ein Schaltjahr?',
      answers: ['365', '366', '367', '364'],
      correct: 1
    },
    {
      q: 'Welches Tier gilt als das schnellste Landtier?',
      answers: ['Löwe', 'Gepard', 'Antilope', 'Falke'],
      correct: 1
    },
    {
      q: 'Welche Farbe entsteht aus Blau und Gelb?',
      answers: ['Grün', 'Orange', 'Lila', 'Braun'],
      correct: 0
    },
    {
      q: 'Welches Metall ist flüssig bei Raumtemperatur?',
      answers: ['Eisen', 'Gold', 'Quecksilber', 'Silber'],
      correct: 2
    },
    {
      q: 'Wie viele Minuten hat eine Stunde?',
      answers: ['50', '60', '70', '90'],
      correct: 1
    },
    {
      q: 'Wie viele Saiten hat eine klassische Gitarre?',
      answers: ['4', '5', '6', '7'],
      correct: 2
    },
    {
      q: 'Wie viele Ecken hat ein Würfel?',
      answers: ['6', '8', '10', '12'],
      correct: 1
    },
    {
      q: 'Welches Land hat die größte Bevölkerung?',
      answers: ['Indien', 'USA', 'China', 'Russland'],
      correct: 0
    }
  ],
  romantisch: [
    {
      q: 'An welchem Tag wird der Valentinstag gefeiert?',
      answers: ['14. Februar', '14. März', '1. Februar', '24. Februar'],
      correct: 0
    },
    {
      q: 'Welche Farbe wird am häufigsten mit Liebe verbunden?',
      answers: ['Blau', 'Rot', 'Grün', 'Gelb'],
      correct: 1
    },
    {
      q: 'Welches Symbol steht häufig für Liebe?',
      answers: ['Stern', 'Herz', 'Blitz', 'Kleeblatt'],
      correct: 1
    },
    {
      q: 'In welcher Stadt steht der berühmte Liebes-Balkon von Romeo und Julia?',
      answers: ['Venedig', 'Verona', 'Rom', 'Florenz'],
      correct: 1
    },
    {
      q: 'Welche Blume gilt als klassische Liebesblume?',
      answers: ['Rose', 'Tulpe', 'Lilie', 'Sonnenblume'],
      correct: 0
    },
    {
      q: 'Wie viele Jahre nennt man eine „Silberhochzeit“?',
      answers: ['10', '20', '25', '30'],
      correct: 2
    },
    {
      q: 'Welches Getränk wird oft bei romantischen Dates getrunken?',
      answers: ['Cola', 'Champagner', 'Wasser', 'Kaffee'],
      correct: 1
    },
    {
      q: 'Welche Stadt wird oft „Stadt der Liebe“ genannt?',
      answers: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct: 0
    },
    {
      q: 'Wie nennt man eine Liebeserklärung auf Französisch?',
      answers: ['Je t’aime', 'Bon appétit', 'Au revoir', 'Merci'],
      correct: 0
    },
    {
      q: 'Welche Farbe haben klassische Hochzeitskleider meistens?',
      answers: ['Schwarz', 'Rot', 'Weiß', 'Blau'],
      correct: 2
    }
  ]
  ,
  gaming: [
    { q: 'Wie heißt der Held von The Legend of Zelda?', answers: ['Zelda', 'Link', 'Ganon', 'Sheik'], correct: 1 },
    { q: 'Wie heißt der Klempner von Nintendo?', answers: ['Luigi', 'Mario', 'Wario', 'Toad'], correct: 1 },
    { q: 'Wie heißt der Bruder von Mario?', answers: ['Bowser', 'Yoshi', 'Luigi', 'Waluigi'], correct: 2 },
    { q: 'Wie heißt das meistverkaufte Spiel aller Zeiten?', answers: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], correct: 1 },
    { q: 'Welche Firma entwickelte Fortnite?', answers: ['Epic Games', 'Valve', 'EA', 'Ubisoft'], correct: 0 },
    { q: 'Wer entwickelte Minecraft?', answers: ['Mojang', 'Nintendo', 'Rockstar', 'Blizzard'], correct: 0 },
    { q: 'Wie heißt der Gegner von Mario?', answers: ['Bowser', 'Ganondorf', 'Ridley', 'Eggman'], correct: 0 },
    { q: 'Wie heißt das Pokémon Maskottchen?', answers: ['Eevee', 'Pikachu', 'Mew', 'Charizard'], correct: 1 },
    { q: 'Wie viele Pokémon gab es in der ersten Generation?', answers: ['150', '151', '152', '100'], correct: 1 },
    { q: 'Wie heißt der Trainer im Pokémon Anime?', answers: ['Ash Ketchum', 'Brock', 'Gary', 'Misty'], correct: 0 },
    { q: 'Wie heißt die Welt in World of Warcraft?', answers: ['Azeroth', 'Tamriel', 'Hyrule', 'Eorzea'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von The Witcher?', answers: ['Geralt', 'Ciri', 'Vesemir', 'Lambert'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von God of War?', answers: ['Kratos', 'Atreus', 'Zeus', 'Ares'], correct: 0 },
    { q: 'Wie heißt die KI in Halo?', answers: ['Cortana', 'GLaDOS', 'EVE', 'Jarvis'], correct: 0 },
    { q: 'Wer entwickelte GTA?', answers: ['Rockstar Games', 'Ubisoft', 'EA', 'Bethesda'], correct: 0 },
    { q: 'Wie heißt der Protagonist von Red Dead Redemption 2?', answers: ['Arthur Morgan', 'John Marston', 'Dutch', 'Micah'], correct: 0 },
    { q: 'Wie heißt die Stadt in GTA V?', answers: ['Liberty City', 'Los Santos', 'Vice City', 'San Fierro'], correct: 1 },
    { q: 'Wie heißt der Held von Skyrim?', answers: ['Dovahkiin', 'Arthas', 'Shepard', 'Geralt'], correct: 0 },
    { q: 'Wie heißt das Land in Skyrim?', answers: ['Himmelsrand', 'Azeroth', 'Hyrule', 'Midgar'], correct: 0 },
    { q: 'Welche Firma entwickelte PlayStation?', answers: ['Sony', 'Microsoft', 'Nintendo', 'Sega'], correct: 0 },
    { q: 'Welche Firma entwickelte Xbox?', answers: ['Sony', 'Microsoft', 'Nintendo', 'Valve'], correct: 1 },
    { q: 'Wie heißt der Entwickler von League of Legends?', answers: ['Riot Games', 'Valve', 'Blizzard', 'Epic'], correct: 0 },
    { q: 'Wie heißt der Protagonist von Half Life?', answers: ['Gordon Freeman', 'Alyx', 'Barney', 'Shepard'], correct: 0 },
    { q: 'Wie heißt der Gegner von Sonic?', answers: ['Dr Eggman', 'Bowser', 'Ridley', 'Kefka'], correct: 0 },
    { q: 'Wie heißt das Endmonster in Minecraft?', answers: ['Enderdrache', 'Wither', 'Creeper', 'Ghast'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von Assassin’s Creed 1?', answers: ['Altair', 'Ezio', 'Connor', 'Bayek'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von Assassin’s Creed 2?', answers: ['Altair', 'Ezio', 'Edward', 'Kassandra'], correct: 1 },
    { q: 'Wie heißt der Entwickler von Call of Duty?', answers: ['Activision', 'EA', 'Ubisoft', 'Valve'], correct: 0 },
    { q: 'Wie heißt der Entwickler von Overwatch?', answers: ['Blizzard', 'Riot', 'Epic', 'Rockstar'], correct: 0 },
    { q: 'Wie heißt der Entwickler von Diablo?', answers: ['Blizzard', 'EA', 'Valve', 'CD Projekt'], correct: 0 },
    { q: 'Welches Spiel gewann Game of the Year 2022?', answers: ['Elden Ring', 'God of War', 'Halo Infinite', 'Horizon'], correct: 0 },
    { q: 'Wie heißt der Entwickler von Cyberpunk 2077?', answers: ['CD Projekt Red', 'Ubisoft', 'EA', 'Bethesda'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von Tomb Raider?', answers: ['Lara Croft', 'Jill Valentine', 'Aloy', 'Ellie'], correct: 0 },
    { q: 'Wie heißt der Gegner in Pac Man?', answers: ['Ghosts', 'Goombas', 'Koopas', 'Wraiths'], correct: 0 },
    { q: 'Wie heißt der Hauptcharakter von Doom?', answers: ['Doom Slayer', 'Duke Nukem', 'Master Chief', 'Shepard'], correct: 0 },
    { q: 'Final Fantasy ist vor allem eine…', answers: ['RPG-Serie', 'Sportreihe', 'Puzzle-Reihe', 'Rennspiel'], correct: 0 },
    { q: 'Dark Souls ist bekannt für…', answers: ['hohen Schwierigkeitsgrad', 'Rennsport', 'Aufbau', 'Musik'], correct: 0 },
    { q: 'In Among Us spielt man…', answers: ['Crewmate oder Impostor', 'Ritter', 'Trainer', 'Pilot'], correct: 0 },
    { q: 'In Counter-Strike spielt man…', answers: ['Terroristen vs. CT', 'Teamsport', 'Solo-RPG', 'Bau-Simulation'], correct: 0 },
    { q: 'Valorant ist ein…', answers: ['Taktik-Shooter', 'Rennspiel', 'Sportspiel', 'Survival'], correct: 0 },
    { q: 'In Monster Hunter jagt man…', answers: ['Monster', 'Geister', 'Autos', 'Planeten'], correct: 0 }
  ],
  film: [
    { q: 'Wer spielte Jack in Titanic?', answers: ['Brad Pitt', 'Leonardo DiCaprio', 'Tom Hanks', 'Matt Damon'], correct: 1 },
    { q: 'Wer spielte Rose in Titanic?', answers: ['Kate Winslet', 'Anne Hathaway', 'Julia Roberts', 'Keira Knightley'], correct: 0 },
    { q: 'Wer führte Regie bei Avatar?', answers: ['James Cameron', 'Steven Spielberg', 'Peter Jackson', 'Christopher Nolan'], correct: 0 },
    { q: 'Wie heißt der Zauberlehrer bei Harry Potter?', answers: ['Snape', 'Dumbledore', 'Hagrid', 'Voldemort'], correct: 1 },
    { q: 'Wie heißt der Hauptcharakter von Matrix?', answers: ['Neo', 'Morpheus', 'Smith', 'Trinity'], correct: 0 },
    { q: 'Wer spielte Iron Man?', answers: ['Robert Downey Jr', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], correct: 0 },
    { q: 'Wer spielte Thor?', answers: ['Chris Evans', 'Chris Hemsworth', 'Tom Holland', 'Paul Rudd'], correct: 1 },
    { q: 'Wer spielte Captain America?', answers: ['Chris Evans', 'Chris Pratt', 'Ben Affleck', 'Ryan Reynolds'], correct: 0 },
    { q: 'Wer spielte Joker in The Dark Knight?', answers: ['Joaquin Phoenix', 'Heath Ledger', 'Jared Leto', 'Jack Nicholson'], correct: 1 },
    { q: 'Wie heißt der Bösewicht in Star Wars?', answers: ['Darth Vader', 'Yoda', 'Obi-Wan', 'Han Solo'], correct: 0 },
    { q: 'Wer spielte Forrest Gump?', answers: ['Tom Hanks', 'Matt Damon', 'Brad Pitt', 'Will Smith'], correct: 0 },
    { q: 'Wie heißt die Stadt von Batman?', answers: ['Gotham', 'Metropolis', 'Star City', 'Central City'], correct: 0 },
    { q: 'Wie heißt der Drache im Hobbit?', answers: ['Smaug', 'Drogon', 'Falkor', 'Toothless'], correct: 0 },
    { q: 'Wer komponierte Star Wars Musik?', answers: ['John Williams', 'Hans Zimmer', 'Howard Shore', 'Danny Elfman'], correct: 0 },
    { q: 'In welchem Jahr erschien Jurassic Park?', answers: ['1991', '1993', '1995', '1997'], correct: 1 },
    { q: 'Marvel und DC sind vor allem…', answers: ['Comic-Universen', 'Sportligen', 'Bands', 'Autos'], correct: 0 },
    { q: 'Harry Potter spielt in…', answers: ['Hogwarts', 'Narnia', 'Mordor', 'Pandora'], correct: 0 },
    { q: 'Herr der Ringe wurde vor allem in…', answers: ['Neuseeland', 'Island', 'Irland', 'Kanada'], correct: 0 },
    { q: 'Pixar ist bekannt für…', answers: ['Animationsfilme', 'Horror', 'Western', 'Dokumentation'], correct: 0 },
    { q: 'Ein „Oscar“ ist…', answers: ['Filmpreis', 'Sporttrophäe', 'Musikpreis', 'Literaturpreis'], correct: 0 },
    { q: 'Wer ist der Regisseur von Inception?', answers: ['Christopher Nolan', 'Ridley Scott', 'James Cameron', 'Tim Burton'], correct: 0 },
    { q: 'In Star Wars ist die Macht…', answers: ['The Force', 'The Magic', 'The Power', 'The Spark'], correct: 0 },
    { q: 'Wer spielte Indiana Jones?', answers: ['Harrison Ford', 'Tom Cruise', 'Mel Gibson', 'Mark Wahlberg'], correct: 0 },
    { q: 'In Fast & Furious geht es um…', answers: ['Autos', 'Drachen', 'Zauber', 'Weltall'], correct: 0 },
    { q: 'Mission Impossible Hauptdarsteller?', answers: ['Tom Cruise', 'Brad Pitt', 'Keanu Reeves', 'Jason Statham'], correct: 0 }
  ]
}

export const drawingWords: Record<Edition, string[]> = {
  fussball: [
    'Torjubel',
    'Schwalbe',
    'Rote Karte',
    'Eckball',
    'Abseits',
    'VAR',
    'Freistoß',
    'Fallrückzieher',
    'Torwartparade',
    'Elfmeterschießen',
    'Fußballstadion',
    'Trainer',
    'Fans im Stadion',
    'Pokal',
    'Champions League',
    'Weltmeister',
    'Trikot',
    'Eckfahne',
    'Torlinie',
    'Gelbe Karte'
  ],
  wissen: [
    'Elefant',
    'Pizza',
    'Flugzeug',
    'Regenbogen',
    'Dinosaurier',
    'Rakete',
    'Schule',
    'Arzt',
    'Polizei',
    'Roboter',
    'Smartphone',
    'Laptop',
    'Fahrrad',
    'Auto',
    'Haus',
    'Baum',
    'Wolke',
    'Sonne',
    'Mond',
    'Stern'
  ],
  romantisch: [
    'Herz',
    'Hochzeit',
    'Kuss',
    'Date',
    'Liebesbrief',
    'Rosenstrauß',
    'Kerzenlicht',
    'Candlelight Dinner',
    'Hochzeitstorte',
    'Liebespaar',
    'Ring',
    'Heiratsantrag',
    'Valentinstag',
    "Cupid's Pfeil",
    'Herzballon',
    'Paar im Park',
    'Sonnenuntergang',
    'Umarmung',
    'Herzschloss',
    'Picknick'
  ]
  ,
  gaming: [
    'Controller',
    'Gaming PC',
    'Mario',
    'Luigi',
    'Pikachu',
    'Minecraft Creeper',
    'Enderdrache',
    'Zombie',
    'Ritter',
    'Schwert',
    'Schild',
    'Schatztruhe',
    'Dungeon',
    'Endboss',
    'Power Up',
    'Level Up',
    'Mana Trank',
    'Heiltrank',
    'Joystick',
    'Gamepad',
    'Gaming Maus',
    'Gaming Headset',
    'Gaming Stuhl',
    'Drache',
    'Alien',
    'Raumschiff',
    'Portal',
    'Pixel Herz',
    'Quest',
    'Loot',
    'Bosskampf',
    'Arena',
    'Inventar',
    'Schatzkarte',
    'Teleporter',
    'Dungeonkarte',
    'Zauberstab',
    'Zauberbuch',
    'Magier',
    'Ritterrüstung',
    'Burg',
    'Turm',
    'Drachenkampf',
    'Arena Kampf',
    'XP Punkte',
    'Goldmünzen',
    'Gaming Setup',
    'Spielkonsole',
    'Gaming Bildschirm',
    'Power Schild'
  ],
  film: [
    'Dinosaurier',
    'Raumschiff',
    'Superheld',
    'Vampir',
    'Zombie',
    'Lichtschwert',
    'Alien',
    'Pirat',
    'Roboter',
    'Zauberer',
    'Drache',
    'Filmkamera',
    'Kino',
    'Monster',
    'Schatzkarte',
    'Superheldenmaske',
    'Detektiv',
    'Geisterhaus',
    'Explosion',
    'Zeitmaschine',
    'Piratenschiff',
    'Weltraum',
    'Asteroid',
    'Alieninvasion',
    'Drachenflug',
    'Vampirbiss',
    'Zombieapokalypse',
    'Superheldenflug',
    'Geister',
    'Schatzinsel',
    'Monsterkampf',
    'Superkraft',
    'Magischer Ring',
    'Zauberschule',
    'Filmset',
    'Kamera Crew'
  ]
}

export const votingQuestions: Record<Edition, string[]> = {
  fussball: [
    'Wer würde im Freundeskreis am ehesten ein Eigentor schießen?',
    'Wer würde am ehesten wegen Meckerns eine Gelbe Karte bekommen?',
    'Wer wäre der schlechteste Torwart?',
    'Wer würde am ehesten im Stadion einschlafen?',
    'Wer würde am ehesten Trainer werden?',
    'Wer würde beim Elfmeterschießen am meisten nervös werden?',
    'Wer würde am ehesten eine Schwalbe machen?',
    'Wer wäre der größte Fußballfan?',
    'Wer würde am ehesten ein Tor verpassen weil er aufs Handy schaut?',
    'Wer würde am ehesten im Stadion Bier verschütten?'
  ],
  wissen: [
    'Wer würde am ehesten eine Zombie-Apokalypse überleben?',
    'Wer würde am ehesten Millionär werden?',
    'Wer würde am ehesten ein UFO sehen?',
    'Wer würde am ehesten im Dschungel verloren gehen?',
    'Wer würde am ehesten ein geheimes Talent haben?',
    'Wer würde am ehesten ein berühmter Influencer werden?',
    'Wer würde am ehesten im Fernsehen landen?',
    'Wer würde am ehesten aus Versehen etwas Teures kaputt machen?',
    'Wer würde am ehesten eine verrückte Geschäftsidee haben?',
    'Wer würde am ehesten ein Buch schreiben?'
  ],
  romantisch: [
    'Wer würde am ehesten heimlich verliebt sein?',
    'Wer würde am ehesten eine kitschige Liebeserklärung machen?',
    'Wer würde am ehesten ein romantisches Date planen?',
    'Wer würde am ehesten beim ersten Date zu nervös sein?',
    'Wer würde am ehesten eine Beziehung im Freundeskreis starten?',
    'Wer würde am ehesten einen Liebesbrief schreiben?',
    'Wer würde am ehesten beim Film weinen?',
    'Wer würde am ehesten eine Fernbeziehung führen?',
    'Wer würde am ehesten eine spontane Hochzeit planen?',
    'Wer würde am ehesten den Jahrestag vergessen?'
  ]
  ,
  gaming: [
    'Wer würde eher 10 Stunden am Stück zocken?',
    'Wer würde eher ein Ragequit machen?',
    'Wer würde eher ein Spiel durchspeedrunnen?',
    'Wer würde eher ein Gaming Streamer werden?',
    'Wer würde eher ein Turnier gewinnen?',
    'Wer würde eher einen Controller zerstören?',
    'Wer würde eher die ganze Nacht zocken?',
    'Wer würde eher ein Retro Spiel spielen?',
    'Wer würde eher ein Spiel modden?',
    'Wer würde eher ein Spiel hacken?',
    'Wer würde eher ein Spiel komplett auf 100% spielen?',
    'Wer würde eher ein Spiel sammeln?',
    'Wer würde eher ein Spiel entwickeln?',
    'Wer würde eher ein Gaming Setup bauen?',
    'Wer würde eher Profi Gamer werden?',
    'Wer würde eher einen Speedrun schaffen?',
    'Wer würde eher ein Indie Spiel finden?',
    'Wer würde eher ein Spiel streamen?',
    'Wer würde eher ein Spiel sofort kaufen?',
    'Wer würde eher ein Spiel vorbestellen?',
    'Wer würde eher ein Spiel nach 5 Minuten aufgeben?',
    'Wer würde eher ein Spiel ohne Pause spielen?',
    'Wer würde eher ein Spiel modifizieren?',
    'Wer würde eher ein Spiel komplett auswendig kennen?'
  ],
  film: [
    'Wer würde eher in einem Horrorfilm sterben?',
    'Wer würde eher ein Superheld sein?',
    'Wer würde eher ein Bösewicht sein?',
    'Wer würde eher einen Oscar gewinnen?',
    'Wer würde eher im Kino einschlafen?',
    'Wer würde eher bei einem Horrorfilm schreien?',
    'Wer würde eher eine Filmrolle bekommen?',
    'Wer würde eher ein Regisseur werden?',
    'Wer würde eher ein Stuntman sein?',
    'Wer würde eher einen Liebesfilm schauen?',
    'Wer würde eher in einem Zombie Film überleben?',
    'Wer würde eher ein Disney Charakter sein?',
    'Wer würde eher einen Horrorfilm drehen?',
    'Wer würde eher ein Drehbuch schreiben?',
    'Wer würde eher ein Actionheld sein?',
    'Wer würde eher eine Filmsammlung besitzen?',
    'Wer würde eher alle Marvel Filme schauen?',
    'Wer würde eher einen Film spoilern?',
    'Wer würde eher eine Filmszene nachspielen?'
  ]
}

export type EmojiRiddle = { emoji: string; answer: string }
export type EmojiRiddleWithEdition = EmojiRiddle & { edition: Edition }
export type CategoryPrompt = { word: string }

export const emojiRiddles: Record<Edition, EmojiRiddle[]> = {
  fussball: [
    { emoji: '⚽🥅', answer: 'Tor' },
    { emoji: '🟥⚽', answer: 'Rote Karte' },
    { emoji: '🟨⚽', answer: 'Gelbe Karte' },
    { emoji: '🧤🥅', answer: 'Torwart' },
    { emoji: '⚽👟', answer: 'Schuss' },
    { emoji: '⚽👥', answer: 'Pass' },
    { emoji: '⚽🏃', answer: 'Dribbling' },
    { emoji: '⚽📏', answer: 'Abseits' },
    { emoji: '⚽📐', answer: 'Eckball' },
    { emoji: '⚽🎯', answer: 'Freistoß' },
    { emoji: '⚽🎯🥅', answer: 'Elfmeter' },
    { emoji: '🏆⚽', answer: 'Meisterschaft' },
    { emoji: '🇩🇪⚽', answer: 'Deutschland Fußball' },
    { emoji: '🇧🇷⚽', answer: 'Brasilien Fußball' },
    { emoji: '🇦🇷⚽', answer: 'Argentinien Fußball' },
    { emoji: '⚽🌍🏆', answer: 'Weltmeisterschaft' },
    { emoji: '⚽🇪🇺🏆', answer: 'Europameisterschaft' },
    { emoji: '⚽🏟️', answer: 'Stadion' },
    { emoji: '⚽👨‍⚖️', answer: 'Schiedsrichter' },
    { emoji: '⚽👕', answer: 'Trikot' },
    { emoji: '🇧🇷⚽🏆', answer: 'Brasilien Weltmeister' },
    { emoji: '🇩🇪⚽🏆', answer: 'Deutschland Weltmeister' },
    { emoji: '🥅⚽', answer: 'Tor' }
  ],
  wissen: [
    { emoji: '🌍🗺️', answer: 'Erde' },
    { emoji: '☀️🌎', answer: 'Sonnensystem' },
    { emoji: '🌙🌌', answer: 'Mond' },
    { emoji: '🐘🌍', answer: 'Elefant' },
    { emoji: '🐍🌳', answer: 'Schlange' },
    { emoji: '🚗🛣️', answer: 'Auto' },
    { emoji: '✈️🌍', answer: 'Flugzeug' },
    { emoji: '📱💬', answer: 'Smartphone' },
    { emoji: '💻🖥️', answer: 'Computer' },
    { emoji: '📚🎓', answer: 'Studium' },
    { emoji: '🍕🇮🇹', answer: 'Pizza' },
    { emoji: '🍔🇺🇸', answer: 'Burger' },
    { emoji: '🍣🇯🇵', answer: 'Sushi' },
    { emoji: '🏔️🌍', answer: 'Berg' },
    { emoji: '🌊🏝️', answer: 'Strand' },
    { emoji: '🚆🏙️', answer: 'Zug' },
    { emoji: '🚲🌳', answer: 'Fahrrad' },
    { emoji: '🏫📚', answer: 'Schule' },
    { emoji: '🏥💊', answer: 'Krankenhaus' },
    { emoji: '🛒🏬', answer: 'Supermarkt' }
  ],
  romantisch: [
    { emoji: '❤️🌹', answer: 'Liebe' },
    { emoji: '💍👰', answer: 'Heirat' },
    { emoji: '💑🌅', answer: 'Romantisches Date' },
    { emoji: '💌❤️', answer: 'Liebesbrief' },
    { emoji: '🍷🕯️', answer: 'Candlelight Dinner' },
    { emoji: '💋❤️', answer: 'Kuss' },
    { emoji: '🎁❤️', answer: 'Romantisches Geschenk' },
    { emoji: '🌹💑', answer: 'Paar' },
    { emoji: '❤️🎶', answer: 'Liebeslied' },
    { emoji: '🌹💌', answer: 'Romantik' },
    { emoji: '💑🌍', answer: 'Fernbeziehung' },
    { emoji: '❤️💬', answer: 'Liebesgeständnis' },
    { emoji: '💑🎬', answer: 'Romantikfilm' },
    { emoji: '💑🍽️', answer: 'Date Dinner' },
    { emoji: '❤️🍫', answer: 'Valentinstag' },
    { emoji: '💍❤️', answer: 'Verlobung' },
    { emoji: '💑🏖️', answer: 'Flitterwochen' },
    { emoji: '💑🎵', answer: 'Liebestanz' },
    { emoji: '💑🌙', answer: 'Romantischer Abend' },
    { emoji: '💑🌸', answer: 'Frühlingsliebe' }
  ],
  gaming: [
    { emoji: '🧱⛏️', answer: 'Minecraft' },
    { emoji: '🍄👨', answer: 'Mario' },
    { emoji: '⚔️🐉', answer: 'Skyrim' },
    { emoji: '🎮🏆', answer: 'Gaming Turnier' },
    { emoji: '🎮💻', answer: 'PC Gaming' },
    { emoji: '🎮📺', answer: 'Konsole' },
    { emoji: '🧟🔫', answer: 'Zombie Shooter' },
    { emoji: '👾🎮', answer: 'Retro Game' },
    { emoji: '🕹️🎮', answer: 'Arcade Spiel' },
    { emoji: '🏎️🎮', answer: 'Rennspiel' },
    { emoji: '🎮👥', answer: 'Multiplayer' },
    { emoji: '🎮🌐', answer: 'Online Spiel' },
    { emoji: '🎮👤', answer: 'Singleplayer' },
    { emoji: '🎮🏅', answer: 'Highscore' },
    { emoji: '🎮⚡', answer: 'Powerup' },
    { emoji: '🎮📈', answer: 'Level Up' },
    { emoji: '🎮👑', answer: 'Champion' },
    { emoji: '🎮🎧', answer: 'Gaming Headset' },
    { emoji: '🎮🖥️', answer: 'Gaming PC' }
  ],
  film: [
    { emoji: '🚢💔', answer: 'Titanic' },
    { emoji: '🧙‍♂️💍🌋', answer: 'Herr der Ringe' },
    { emoji: '🦖🏝️', answer: 'Jurassic Park' },
    { emoji: '🕷️🧑', answer: 'Spider-Man' },
    { emoji: '🦇🌃', answer: 'Batman' },
    { emoji: '👑🦁', answer: 'König der Löwen' },
    { emoji: '🤖🚗', answer: 'Transformers' },
    { emoji: '🧙‍♂️⚡', answer: 'Harry Potter' },
    { emoji: '👽🚀', answer: 'Alien' },
    { emoji: '🧊👑', answer: 'Frozen' },
    { emoji: '🚗💨', answer: 'Fast and Furious' },
    { emoji: '🧑‍🚀🌌', answer: 'Interstellar' },
    { emoji: '🧟‍♂️🌍', answer: 'Zombie Film' },
    { emoji: '👻🏠', answer: 'Geisterfilm' },
    { emoji: '🕵️‍♂️🔍', answer: 'Detektivfilm' },
    { emoji: '👑⚔️', answer: 'Fantasyfilm' },
    { emoji: '🚀🌌', answer: 'Science Fiction' },
    { emoji: '🦸‍♂️🌍', answer: 'Superheld Film' },
    { emoji: '🧛‍♂️🩸', answer: 'Vampir Film' },
    { emoji: '🤠🐎', answer: 'Western Film' }
  ]
}

export const categoryPrompts: Record<Edition, CategoryPrompt[]> = {
  fussball: [
    { word: 'Torwart' },
    { word: 'Stürmer' },
    { word: 'Mittelfeldspieler' },
    { word: 'Verteidiger' },
    { word: 'Trainer' },
    { word: 'Schiedsrichter' },
    { word: 'Eckball' },
    { word: 'Freistoß' },
    { word: 'Elfmeter' },
    { word: 'Hattrick' },
    { word: 'Bundesliga' },
    { word: 'Champions League' },
    { word: 'Weltmeisterschaft' },
    { word: 'Europameisterschaft' },
    { word: 'VAR' },
    { word: 'Abseits' },
    { word: 'Torlinie' },
    { word: 'Anstoß' },
    { word: 'Nachspielzeit' },
    { word: 'Auswechslung' }
  ],
  wissen: [
    { word: 'Haus' },
    { word: 'Auto' },
    { word: 'Buch' },
    { word: 'Baum' },
    { word: 'Schule' },
    { word: 'Lehrer' },
    { word: 'Stadt' },
    { word: 'Land' },
    { word: 'Fluss' },
    { word: 'Berg' },
    { word: 'Restaurant' },
    { word: 'Supermarkt' },
    { word: 'Krankenhaus' },
    { word: 'Polizei' },
    { word: 'Feuerwehr' },
    { word: 'Museum' },
    { word: 'Flughafen' },
    { word: 'Bahnhof' },
    { word: 'Park' },
    { word: 'Zoo' }
  ],
  romantisch: [
    { word: 'Date' },
    { word: 'Kuss' },
    { word: 'Umarmung' },
    { word: 'Rosen' },
    { word: 'Herz' },
    { word: 'Verlobung' },
    { word: 'Hochzeit' },
    { word: 'Valentinstag' },
    { word: 'Liebesbrief' },
    { word: 'Picknick' },
    { word: 'Kerzen' },
    { word: 'Romantikfilm' },
    { word: 'Spaziergang' },
    { word: 'Geschenk' },
    { word: 'Schokolade' },
    { word: 'Ringe' },
    { word: 'Flitterwochen' },
    { word: 'Tanz' },
    { word: 'Paar' },
    { word: 'Herzballon' }
  ],
  gaming: [
    { word: 'Controller' },
    { word: 'Joystick' },
    { word: 'Gaming PC' },
    { word: 'Konsole' },
    { word: 'Level' },
    { word: 'Boss' },
    { word: 'Quest' },
    { word: 'Loot' },
    { word: 'XP' },
    { word: 'Dungeon' },
    { word: 'Speedrun' },
    { word: 'Streamer' },
    { word: 'Multiplayer' },
    { word: 'Server' },
    { word: 'Patch' },
    { word: 'Mod' },
    { word: 'Clan' },
    { word: 'Leaderboard' },
    { word: 'Skin' },
    { word: 'Powerup' }
  ],
  film: [
    { word: 'Superheld' },
    { word: 'Alien' },
    { word: 'Roboter' },
    { word: 'Pirat' },
    { word: 'Detektiv' },
    { word: 'Zauberer' },
    { word: 'Drache' },
    { word: 'Monster' },
    { word: 'Zeitreise' },
    { word: 'Weltraum' },
    { word: 'Actionfilm' },
    { word: 'Horrorfilm' },
    { word: 'Komödie' },
    { word: 'Thriller' },
    { word: 'Fantasyfilm' },
    { word: 'Science Fiction' },
    { word: 'Animationsfilm' },
    { word: 'Blockbuster' },
    { word: 'Filmstudio' },
    { word: 'Oscar' }
  ]
}

export const getEmojiRiddles = (editions: Edition[]) =>
  editions.flatMap((edition) => emojiRiddles[edition])

export const getEmojiRiddlesWithEdition = (editions: Edition[]): EmojiRiddleWithEdition[] =>
  editions.flatMap((edition) =>
    emojiRiddles[edition].map((riddle) => ({
      ...riddle,
      edition
    }))
  )

export const getCategoryPrompts = (editions: Edition[]) =>
  editions.flatMap((edition) => categoryPrompts[edition])

export const getQuizQuestions = (editions: Edition[]) =>
  editions.flatMap((edition) => quizQuestions[edition])

export const getDrawingWords = (editions: Edition[]) =>
  editions.flatMap((edition) => drawingWords[edition])

export const getVotingQuestions = (editions: Edition[]) =>
  editions.flatMap((edition) => votingQuestions[edition])
