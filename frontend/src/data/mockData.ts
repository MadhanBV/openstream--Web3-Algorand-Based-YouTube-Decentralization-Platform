import type { Video, Creator, Settlement, Category, Comment } from '../types'

export const mockCreators: Creator[] = []

export const mockCategories: Category[] = [
  { id: 'cat-all', name: 'All Videos', slug: 'all' },
  { id: 'cat-tech', name: 'Tech & Architecture', slug: 'tech' },
  { id: 'cat-web3', name: 'Web3 & Algorand', slug: 'web3' },
  { id: 'cat-creative', name: 'Cinematic & Art', slug: 'creative' },
  { id: 'cat-education', name: 'Tutorials & Code', slug: 'education' },
  { id: 'cat-infra', name: 'IPFS & Storage', slug: 'infra' },
  { id: 'cat-podcasts', name: 'Creator Talks', slug: 'podcasts' }
]

export const mockVideos: Video[] = []

export const mockComments: Comment[] = []

export const mockSettlements: Settlement[] = []
