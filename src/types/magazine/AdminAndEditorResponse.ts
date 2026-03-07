export interface AdminAndEditorResponse {
  id: number
  titles: string
  description: string
  allowSubscription: boolean
  allowComments: boolean
  allowReactions: boolean
  activeMagazine: boolean
  dailyCost: number
  adBlockCost: number
  creationDate: Date
}
