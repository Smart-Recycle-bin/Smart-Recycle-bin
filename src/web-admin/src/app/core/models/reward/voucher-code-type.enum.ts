export const VoucherCodeType = {
  Code: 'code',
  Qr: 'qr',
  Barcode: 'barcode',
} as const;

export type VoucherCodeType = (typeof VoucherCodeType)[keyof typeof VoucherCodeType];

export const VOUCHER_CODE_TYPE_LABELS: Record<VoucherCodeType, string> = {
  [VoucherCodeType.Code]: 'Code',
  [VoucherCodeType.Qr]: 'QR',
  [VoucherCodeType.Barcode]: 'Barcode',
};
