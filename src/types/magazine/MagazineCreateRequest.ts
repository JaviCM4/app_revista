export interface MagazineCreateRequest {
  title: string
  description: string
  allowSubscription: boolean
  allowComments: boolean
  allowReactions: boolean
  createDate: Date
}
