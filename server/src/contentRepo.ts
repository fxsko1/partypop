import { EditionKey, GameMode, RoundContent } from '@shared/types'
import { dbQuery, hasDatabaseConfig } from './db'

const pickBySeed = <T>(items: T[], seed: number) => {
  if (!items.length) return null
  const index = Math.abs(seed) % items.length
  return items[index]
}

const seedFrom = (code: string, round: number, mode: GameMode) => {
  const raw = `${code}:${round}:${mode}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return hash
}

export const getRoundContentFromDb = async (
  code: string,
  round: number,
  mode: GameMode,
  editions: EditionKey[]
): Promise<RoundContent | null> => {
  if (!hasDatabaseConfig()) return null
  const poolEditions = editions.length ? editions : (['wissen'] as EditionKey[])
  const seed = seedFrom(code, round, mode)

  if (mode === 'quiz') {
    const rowsRaw = await dbQuery(
      `select edition, question, answers, correct_index
       from quiz_questions
       where is_active = true and edition = any($1::text[])
       order by id`,
      [poolEditions]
    )
    const rows = rowsRaw.rows as Array<{
      edition: EditionKey
      question: string
      answers: string[]
      correct_index: number
    }>
    const picked = pickBySeed(rows, seed)
    if (!picked) return null
    return {
      mode: 'quiz',
      question: {
        text: picked.question,
        answers: picked.answers,
        correctIndex: picked.correct_index,
        edition: picked.edition
      }
    }
  }

  if (mode === 'drawing') {
    const rowsRaw = await dbQuery(
      `select edition, word
       from drawing_words
       where is_active = true and edition = any($1::text[])
       order by id`,
      [poolEditions]
    )
    const rows = rowsRaw.rows as Array<{ edition: EditionKey; word: string }>
    const picked = pickBySeed(rows, seed)
    if (!picked) return null
    return {
      mode: 'drawing',
      drawing: {
        word: picked.word,
        edition: picked.edition
      }
    }
  }

  if (mode === 'voting') {
    const rowsRaw = await dbQuery(
      `select edition, prompt
       from voting_prompts
       where is_active = true and edition = any($1::text[])
       order by id`,
      [poolEditions]
    )
    const rows = rowsRaw.rows as Array<{ edition: EditionKey; prompt: string }>
    const picked = pickBySeed(rows, seed)
    if (!picked) return null
    return {
      mode: 'voting',
      voting: {
        prompt: picked.prompt,
        edition: picked.edition
      }
    }
  }

  if (mode === 'emoji') {
    const preferred = poolEditions.filter((edition) => edition === 'film' || edition === 'gaming')
    const emojiEditions = preferred.length ? preferred : poolEditions
    const rowsRaw = await dbQuery(
      `select edition, emoji, answer
       from emoji_riddles
       where is_active = true and edition = any($1::text[])
       order by id`,
      [emojiEditions]
    )
    const rows = rowsRaw.rows as Array<{ edition: EditionKey; emoji: string; answer: string }>
    const picked = pickBySeed(rows, seed)
    if (!picked) return null
    return {
      mode: 'emoji',
      emoji: {
        emoji: picked.emoji,
        answer: picked.answer,
        edition: picked.edition
      }
    }
  }

  const rowsRaw = await dbQuery(
    `select edition, prompt
     from category_prompts
     where is_active = true and edition = any($1::text[])
     order by id`,
    [poolEditions]
  )
  const rows = rowsRaw.rows as Array<{ edition: EditionKey; prompt: string }>
  const picked = pickBySeed(rows, seed)
  if (!picked) return null
  return {
    mode: 'category',
    category: {
      prompt: picked.prompt,
      edition: picked.edition
    }
  }
}
