import { beforeEach, describe, expect, it, vi } from 'vitest'

// Guia rapida de este archivo:
// 1) Se mockea el cliente HTTP una sola vez.
// 2) Cada bloque describe(...) representa un service.
// 3) En cada test se valida: endpoint, metodo HTTP y retorno esperado.

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/http', () => ({
  default: apiClientMock,
}))

import { advertisementService } from '@/services/advertisement/advertisement.service'
import { authService } from '@/services/auth/auth.service'
import { editionService } from '@/services/edition/edition.service'
import { interactionService } from '@/services/interaction/interaction.service'
import { categoryService } from '@/services/magazine/category.service'
import { magazineService } from '@/services/magazine/magazine.service'
import { subscriptionService } from '@/services/magazine/subscription.service'
import { tagService } from '@/services/magazine/tag.service'
import { preferenceService } from '@/services/preference/preference.service'
import { reportService } from '@/services/reports/report.service'
import { suggestedCostService } from '@/services/suggested/suggested.service'
import { categoryMagazineService } from '@/services/types/categoryMagazine.service'
import { userService } from '@/services/user/user.service'

// Estructura base para mantener consistencia:
// - Arrange: preparar payload/respuesta mock
// - Act: ejecutar metodo del service
// - Assert: validar llamada a apiClient y resultado
describe('services', () => {
  beforeEach(() => {
    // Reinicia historial y resultados de mocks entre tests.
    vi.clearAllMocks()
  })

  describe('authService', () => {
    it('login usa POST y retorna data', async () => {
      const payload = { username: 'demo', password: '123' }
      const response = { token: 'abc' }
      apiClientMock.post.mockResolvedValueOnce({ data: response })

      const result = await authService.login(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/auth', payload)
      expect(result).toEqual(response)
    })

    it('firstLogin usa POST', async () => {
      const payload = { password: 'nuevo' }

      await authService.firstLogin(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/first-login', payload)
    })

    it('verifyLoginToken usa POST y retorna data', async () => {
      const payload = { token: '123456' }
      const response = { token: 'jwt' }
      apiClientMock.post.mockResolvedValueOnce({ data: response })

      const result = await authService.verifyLoginToken(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/verify-login', payload)
      expect(result).toEqual(response)
    })

    it('recoverPassword usa POST', async () => {
      const payload = { email: 'test@mail.com' }

      await authService.recoverPassword(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/recover-password', payload)
    })

    it('verifyPasswordRecoveryToken usa POST', async () => {
      const payload = { token: 'recover', password: 'new' }

      await authService.verifyPasswordRecoveryToken(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/auth/verify-recover', payload)
    })

    it('toggleVerification usa PUT', async () => {
      await authService.toggleVerification()
      expect(apiClientMock.put).toHaveBeenCalledWith('/auth')
    })

    it('sendLoginToken usa PUT con id', async () => {
      await authService.sendLoginToken(7)
      expect(apiClientMock.put).toHaveBeenCalledWith('/auth/7')
    })
  })

  describe('editionService', () => {
    it('createEdition usa POST', async () => {
      const payload = { idMagazine: 1 }
      await editionService.createEdition(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/editions', payload)
    })

    it('findAllEditionsByMagazine usa GET y retorna data', async () => {
      const response = [{ idEdition: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await editionService.findAllEditionsByMagazine(9)

      expect(apiClientMock.get).toHaveBeenCalledWith('/editions/9')
      expect(result).toEqual(response)
    })

    it('deleteEdition usa DELETE', async () => {
      await editionService.deleteEdition(4)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/editions/4')
    })
  })

  describe('interactionService', () => {
    it('createLike usa POST', async () => {
      const payload = { idMagazine: 4 }
      await interactionService.createLike(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/interaction/like', payload)
    })

    it('createComment usa POST', async () => {
      const payload = { idMagazine: 4, comment: 'texto' }
      await interactionService.createComment(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/interaction/comment', payload)
    })

    it('findLikeByUser usa GET y retorna boolean', async () => {
      apiClientMock.get.mockResolvedValueOnce({ data: true })

      const result = await interactionService.findLikeByUser(4)

      expect(apiClientMock.get).toHaveBeenCalledWith('/interaction/like/4')
      expect(result).toBe(true)
    })

    it('findAllCommentsByMagazine usa GET y retorna data', async () => {
      const response = [{ idComment: 1, comment: 'ok' }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await interactionService.findAllCommentsByMagazine(8)

      expect(apiClientMock.get).toHaveBeenCalledWith('/interaction/comment/8')
      expect(result).toEqual(response)
    })

    it('deleteComment usa DELETE', async () => {
      await interactionService.deleteComment(3)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/interaction/comment/3')
    })
  })

  describe('advertisementService', () => {
    it('createAd usa POST', async () => {
      const payload = { idMagazine: 1 }
      await advertisementService.createAd(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/ads', payload)
    })

    it('blockAd usa POST', async () => {
      const payload = { idAdvertisement: 2 }
      await advertisementService.blockAd(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/ads/block', payload)
    })

    it('disableAd usa PUT', async () => {
      await advertisementService.disableAd(2)
      expect(apiClientMock.put).toHaveBeenCalledWith('/ads/2')
    })

    it('findAllByMagazine usa GET y retorna data', async () => {
      const response = [{ idAdvertisement: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await advertisementService.findAllByMagazine(3)

      expect(apiClientMock.get).toHaveBeenCalledWith('/ads/magazine/3')
      expect(result).toEqual(response)
    })

    it('findAllByAdvertiser usa GET y retorna data', async () => {
      const response = [{ idAdvertisement: 2 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await advertisementService.findAllByAdvertiser()

      expect(apiClientMock.get).toHaveBeenCalledWith('/ads/advertiser')
      expect(result).toEqual(response)
    })

    it('findAllAdvertisement usa GET y retorna data', async () => {
      const response = [{ idAdvertisement: 3 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await advertisementService.findAllAdvertisement()

      expect(apiClientMock.get).toHaveBeenCalledWith('/ads/magazine')
      expect(result).toEqual(response)
    })

    it('getBlockCostByMagazine usa GET y retorna costo', async () => {
      apiClientMock.get.mockResolvedValueOnce({ data: 125.5 })

      const result = await advertisementService.getBlockCostByMagazine(12)

      expect(apiClientMock.get).toHaveBeenCalledWith('/ads/block/12')
      expect(result).toBe(125.5)
    })
  })

  describe('categoryService', () => {
    it('createMagazineCategory usa POST', async () => {
      const payload = { idMagazine: 1, idCategory: 2 }
      await categoryService.createMagazineCategory(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/categories/magazines', payload)
    })

    it('findByMagazineId usa GET y retorna data', async () => {
      const response = [{ idCategoryMagazine: 7 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await categoryService.findByMagazineId(4)

      expect(apiClientMock.get).toHaveBeenCalledWith('/categories/magazines/4')
      expect(result).toEqual(response)
    })

    it('deleteMagazineCategory usa DELETE', async () => {
      await categoryService.deleteMagazineCategory(8)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/categories/magazines/8')
    })
  })

  describe('magazineService', () => {
    it('createMagazine usa POST', async () => {
      const payload = { title: 'Revista' }
      await magazineService.createMagazine(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/magazines', payload)
    })

    it('updateCostMagazine usa PUT', async () => {
      const payload = { idMagazine: 1, cost: 9.9 }
      await magazineService.updateCostMagazine(payload as never)
      expect(apiClientMock.put).toHaveBeenCalledWith('/magazines/cost', payload)
    })

    it('updatePermissionsMagazine usa PUT', async () => {
      const payload = { idMagazine: 1, commentsEnabled: true }
      await magazineService.updatePermissionsMagazine(payload as never)
      expect(apiClientMock.put).toHaveBeenCalledWith('/magazines/permissions', payload)
    })

    it('findAllMagazines usa GET y retorna data', async () => {
      const response = [{ idMagazine: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllMagazines()
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines')
      expect(result).toEqual(response)
    })

    it('findAllByCategory usa GET y retorna data', async () => {
      const response = [{ idMagazine: 2 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllByCategory(5)
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines/category/5')
      expect(result).toEqual(response)
    })

    it('findAllByTag usa GET y retorna data', async () => {
      const response = [{ idMagazine: 3 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllByTag('tech')
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines/tags/tech')
      expect(result).toEqual(response)
    })

    it('findAllEditor usa GET y retorna data', async () => {
      const response = [{ idUser: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllEditor()
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines/editor')
      expect(result).toEqual(response)
    })

    it('findAllSubscriber usa GET y retorna data', async () => {
      const response = [{ idMagazine: 9 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllSubscriber()
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines/subscriber')
      expect(result).toEqual(response)
    })

    it('findAllAdmin usa GET y retorna data', async () => {
      const response = [{ idUser: 2 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await magazineService.findAllAdmin()
      expect(apiClientMock.get).toHaveBeenCalledWith('/magazines/admin')
      expect(result).toEqual(response)
    })
  })

  describe('subscriptionService', () => {
    it('createSubscription usa POST', async () => {
      const payload = { idMagazine: 6 }
      await subscriptionService.createSubscription(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/subscriptions', payload)
    })

    it('deleteSubscription usa DELETE', async () => {
      await subscriptionService.deleteSubscription(6)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/subscriptions/6')
    })
  })

  describe('tagService', () => {
    it('createMagazineTag usa POST', async () => {
      const payload = { idMagazine: 2, tag: 'web' }
      await tagService.createMagazineTag(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/tags', payload)
    })

    it('findByMagazineId usa GET y retorna data', async () => {
      const response = [{ idTag: 1, tag: 'web' }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await tagService.findByMagazineId(10)
      expect(apiClientMock.get).toHaveBeenCalledWith('/tags/10')
      expect(result).toEqual(response)
    })

    it('deleteTag usa DELETE', async () => {
      await tagService.deleteTag(10)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/tags/10')
    })
  })

  describe('preferenceService', () => {
    it('createPreference usa POST', async () => {
      const payload = { idCategory: 2 }
      await preferenceService.createPreference(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/preferences', payload)
    })

    it('findMyPreferences usa GET y retorna data', async () => {
      const response = [{ idPreference: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await preferenceService.findMyPreferences()
      expect(apiClientMock.get).toHaveBeenCalledWith('/preferences')
      expect(result).toEqual(response)
    })

    it('findAllPreferenceAndCategory usa GET y retorna data', async () => {
      const response = { options: [] }
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await preferenceService.findAllPreferenceAndCategory()
      expect(apiClientMock.get).toHaveBeenCalledWith('/preferences/options')
      expect(result).toEqual(response)
    })

    it('deletePreference usa DELETE', async () => {
      await preferenceService.deletePreference(11)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/preferences/11')
    })
  })

  describe('reportService', () => {
    // En reportes tambien validamos el armado de params (fechas).
    it('getCommentsReport formatea Date y envía params', async () => {
      const response = [{ commentsCount: 3 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const startDate = new Date('2026-03-01T12:00:00.000Z')
      const endDate = new Date('2026-03-05T12:00:00.000Z')
      const result = await reportService.getCommentsReport(startDate, endDate)

      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/comments', {
        params: { startDate: '2026-03-01', endDate: '2026-03-05' },
      })
      expect(result).toEqual(response)
    })

    it('getSubscriptionsReport acepta strings de fecha', async () => {
      const response = [{ subscriptionsCount: 9 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await reportService.getSubscriptionsReport('2026-03-01', '2026-03-31')

      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/subscriptions', {
        params: { startDate: '2026-03-01', endDate: '2026-03-31' },
      })
      expect(result).toEqual(response)
    })

    it('getLikesReport envía undefined cuando fechas son null', async () => {
      const response = [{ likesCount: 10 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await reportService.getLikesReport(null, null)

      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/likes', {
        params: { startDate: undefined, endDate: undefined },
      })
      expect(result).toEqual(response)
    })

    it('getPaymentsReport usa endpoint correcto', async () => {
      const response = [{ totalPayments: 150 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getPaymentsReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/payments', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })

    it('getFinancialSummaryReport usa endpoint correcto', async () => {
      const response = { total: 500 }
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getFinancialSummaryReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/financial-summary', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })

    it('getAdvertisementsReport usa endpoint correcto', async () => {
      const response = [{ idAd: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getAdvertisementsReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/advertisements', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })

    it('getAdvertisersReport usa endpoint correcto', async () => {
      const response = [{ idAdvertiser: 2 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getAdvertisersReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/advertisers', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })

    it('getSubscriptionsAdminReport usa endpoint correcto', async () => {
      const response = [{ subscriptionsCount: 4 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getSubscriptionsAdminReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/subscriptions/admin', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })

    it('getCommentsAdminReport usa endpoint correcto', async () => {
      const response = [{ commentsCount: 7 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await reportService.getCommentsAdminReport('2026-03-01', '2026-03-10')
      expect(apiClientMock.get).toHaveBeenCalledWith('/reports/comments/admin', {
        params: { startDate: '2026-03-01', endDate: '2026-03-10' },
      })
      expect(result).toEqual(response)
    })
  })

  describe('suggestedCostService', () => {
    it('create usa POST', async () => {
      const payload = { minPrice: 10 }
      await suggestedCostService.create(payload as never)
      expect(apiClientMock.post).toHaveBeenCalledWith('/suggested-costs', payload)
    })

    it('findAll usa GET y retorna data', async () => {
      const response = [{ id: 1, cost: 10 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })
      const result = await suggestedCostService.findAll()
      expect(apiClientMock.get).toHaveBeenCalledWith('/suggested-costs')
      expect(result).toEqual(response)
    })

    it('delete usa DELETE', async () => {
      await suggestedCostService.delete(9)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/suggested-costs/9')
    })
  })

  describe('categoryMagazineService', () => {
    it('findAllTypeCategoryMagazine usa GET y retorna data', async () => {
      const response = [{ idTypeCategory: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await categoryMagazineService.findAllTypeCategoryMagazine()

      expect(apiClientMock.get).toHaveBeenCalledWith('/type/cat/magazine')
      expect(result).toEqual(response)
    })
  })

  describe('userService', () => {
    it('createUserAndCredential usa POST y retorna data', async () => {
      const payload = { name: 'Ana' }
      const response = { idUser: 3 }
      apiClientMock.post.mockResolvedValueOnce({ data: response })

      const result = await userService.createUserAndCredential(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/users', payload)
      expect(result).toEqual(response)
    })

    it('createUserAndCredentialAdmin usa POST y retorna data', async () => {
      const payload = { name: 'Admin' }
      const response = { idUser: 5 }
      apiClientMock.post.mockResolvedValueOnce({ data: response })

      const result = await userService.createUserAndCredentialAdmin(payload as never)

      expect(apiClientMock.post).toHaveBeenCalledWith('/users/admin', payload)
      expect(result).toEqual(response)
    })

    it('findAllUsers usa GET y retorna data', async () => {
      const response = [{ idUser: 1 }]
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await userService.findAllUsers()

      expect(apiClientMock.get).toHaveBeenCalledWith('/users/list')
      expect(result).toEqual(response)
    })

    it('findMyUser usa GET y retorna data', async () => {
      const response = { idUser: 8 }
      apiClientMock.get.mockResolvedValueOnce({ data: response })

      const result = await userService.findMyUser()

      expect(apiClientMock.get).toHaveBeenCalledWith('/users')
      expect(result).toEqual(response)
    })

    it('updateUser usa PUT y retorna data', async () => {
      const payload = { phone: '12345678' }
      const response = { idUser: 8, phone: '12345678' }
      apiClientMock.put.mockResolvedValueOnce({ data: response })

      const result = await userService.updateUser(payload as never)

      expect(apiClientMock.put).toHaveBeenCalledWith('/users', payload)
      expect(result).toEqual(response)
    })

    it('updateMoney usa PUT', async () => {
      await userService.updateMoney(200)
      expect(apiClientMock.put).toHaveBeenCalledWith('/users/200')
    })

    it('suspendUser usa DELETE', async () => {
      await userService.suspendUser(99)
      expect(apiClientMock.delete).toHaveBeenCalledWith('/users/99')
    })
  })
})

// Como extender esta suite:
// - Si agregas un metodo en un service, crea un it(...) en su bloque describe.
// - Repite el mismo patron: mockResolvedValueOnce -> llamada -> expect.
