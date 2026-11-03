import * as z from 'zod';

import { defineEmail } from '../send';
import { getDefaultTemplate } from '../templates';

export const onPasswordResetEmail = defineEmail({
  id: 'onPasswordReset',
  subject: 'Mật khẩu đã được đổi - MP Learning',
  schema: z.object({
    name: z.string().min(1)
  }),
  render: (fields) => {
    return getDefaultTemplate(`<p>Chào ${fields.name},</p>
    <p>Mật khẩu tài khoản MP Learning của bạn vừa được đổi thành công.</p>
    <p>Nếu không phải bạn đổi, hãy báo ngay cho quản trị đào tạo.</p>
    `);
  }
});
