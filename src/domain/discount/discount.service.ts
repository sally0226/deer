import { Injectable } from "@nestjs/common";
import { ParkingZoneRepository } from "../rentalPay/parkingZone.repository";
import { UseKickboardHistoryRepository } from "../rentalPay/useKickboardHistory.repository";
import { DiscountRepository } from "./discount.repository";
import { RentalPayDto } from "./dto/discount.dto";
import { DiscountResDto } from "./dto/discountRes.dto";

@Injectable()
export class DiscountService {
	discountList = {
		parkingZone: 1,
		firstUsing: 2
	};

	constructor(
		private readonly useKickboardHistoryRepository: UseKickboardHistoryRepository,
		private readonly parkingZoneRepository: ParkingZoneRepository,
		private readonly discountRepository: DiscountRepository
	) {}

	async check(rentalPayDto: RentalPayDto): Promise<DiscountResDto[]> {
		const useHistory = await this.useKickboardHistoryRepository.findLatestOneOfUser(rentalPayDto.user_id);

		const checkList = [
			await this.isParking(rentalPayDto.use_end_lat, rentalPayDto.use_end_lng),
			await this.isFirstUsing(useHistory),
		];

		const filtered = checkList.filter((discount) => {
			return discount !== undefined;
		})

		const result = filtered.map((discount) => {
			return new DiscountResDto(discount)
		});

		// console.log(result);
		return result;	
	}

	// 30분 이내 다시 이용시 기본요금 면제
	static async isReusing(useHistory) {
		const nowTime = new Date().getTime() / 60000;
		const lastTime = new Date(useHistory.use_end_at).getTime() / 60000;
		if (nowTime - lastTime < 30) {
			return true;
		}
		return false;
	}

	// 파킹존 할인
	private async isParking(lat, lng) {
		if (!(await this.parkingZoneRepository.findParkingZone(lat, lng))) {
			return;
		}

		return await this.discountRepository.getDiscount(
			this.discountList.parkingZone
		);
	}

	// 첫 이용
	private async isFirstUsing(useHistory) {
		if (!useHistory) {
			return await this.discountRepository.getDiscount(
				this.discountList.firstUsing
			);
		}
	}
}
