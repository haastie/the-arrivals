// Content komt nu uit de DB via ContentProvider/useContent.
// content_seed.json blijft als back-up/seed-bron in de repo (niet meer geïmporteerd).
export type { QuestionLocation, MappedContent } from './mapContent'
export { ContentProvider, useContent, useContentState } from './ContentProvider'
