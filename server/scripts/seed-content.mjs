import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL fehlt. Bitte in Railway Variables setzen.')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }
})

const quizRows = [
  ['fussball', 'Wie viele Spieler stehen pro Team auf dem Feld?', ['9', '10', '11', '12'], 2],
  ['wissen', 'Wie viele Kontinente gibt es?', ['5', '6', '7', '8'], 2],
  ['romantisch', 'Wann ist Valentinstag?', ['13. Februar', '14. Februar', '15. Februar', '1. März'], 1],
  ['gaming', 'Wie heißt der Held von The Legend of Zelda?', ['Link', 'Zelda', 'Ganon', 'Mario'], 0],
  ['film', 'Wer spielte Jack in Titanic?', ['Tom Hanks', 'Brad Pitt', 'Leonardo DiCaprio', 'Matt Damon'], 2]
]

const drawingRows = [
  ['fussball', 'Torwart'],
  ['wissen', 'Elefant'],
  ['romantisch', 'Herz'],
  ['gaming', 'Controller'],
  ['film', 'Superheld']
]

const votingRows = [
  ['fussball', 'Wer würde am ehesten ein Eigentor schießen?'],
  ['wissen', 'Wer würde am ehesten Millionär werden?'],
  ['romantisch', 'Wer würde am ehesten ein romantisches Date planen?'],
  ['gaming', 'Wer würde eher ein Ragequit machen?'],
  ['film', 'Wer würde eher in einem Horrorfilm sterben?']
]

const emojiRows = [
  ['fussball', '⚽🥅', 'Tor'],
  ['wissen', '🌍🗺️', 'Erde'],
  ['romantisch', '❤️🌹', 'Liebe'],
  ['gaming', '🧱⛏️', 'Minecraft'],
  ['film', '🧙‍♂️💍🌋', 'Herr der Ringe']
]

const categoryRows = [
  ['fussball', 'Bundesliga'],
  ['wissen', 'Museum'],
  ['romantisch', 'Valentinstag'],
  ['gaming', 'Multiplayer'],
  ['film', 'Science Fiction']
]

const run = async () => {
  const client = await pool.connect()
  try {
    await client.query('begin')

    for (const [edition, question, answers, correctIndex] of quizRows) {
      await client.query(
        `
          insert into quiz_questions (edition, question, answers, correct_index)
          values ($1, $2, $3::jsonb, $4)
          on conflict (edition, question) do nothing
        `,
        [edition, question, JSON.stringify(answers), correctIndex]
      )
    }

    for (const [edition, word] of drawingRows) {
      await client.query(
        `
          insert into drawing_words (edition, word)
          values ($1, $2)
          on conflict (edition, word) do nothing
        `,
        [edition, word]
      )
    }

    for (const [edition, prompt] of votingRows) {
      await client.query(
        `
          insert into voting_prompts (edition, prompt)
          values ($1, $2)
          on conflict (edition, prompt) do nothing
        `,
        [edition, prompt]
      )
    }

    for (const [edition, emoji, answer] of emojiRows) {
      await client.query(
        `
          insert into emoji_riddles (edition, emoji, answer)
          values ($1, $2, $3)
          on conflict (edition, emoji, answer) do nothing
        `,
        [edition, emoji, answer]
      )
    }

    for (const [edition, prompt] of categoryRows) {
      await client.query(
        `
          insert into category_prompts (edition, prompt)
          values ($1, $2)
          on conflict (edition, prompt) do nothing
        `,
        [edition, prompt]
      )
    }

    await client.query('commit')
    console.log('Seed erfolgreich.')
  } catch (error) {
    await client.query('rollback')
    console.error('Seed fehlgeschlagen:', error)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

await run()
