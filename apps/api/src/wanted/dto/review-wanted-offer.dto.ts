import { IsEnum } from 'class-validator';

export enum WantedOfferReviewAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT'
}

export class ReviewWantedOfferDto {
  @IsEnum(WantedOfferReviewAction)
  action: WantedOfferReviewAction;
}
