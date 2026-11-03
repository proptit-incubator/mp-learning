import * as z from 'zod';

import { defineEmail } from '../send';
import { getDefaultTemplate } from '../templates';

export const forgotPasswordEmail = defineEmail({
  id: 'forgotPassword',
  subject: 'Đặt lại mật khẩu - MP Learning',
  schema: z.object({
    email: z.email(),
    name: z.string().min(1),
    link: z.url()
  }),
  render: (fields) => {
    const content = `<p>Chào ${fields.name},</p>
    <p>Bạn vừa yêu cầu đặt lại mật khẩu tài khoản MP Learning.</p>
    <p>Bấm nút dưới đây để đặt mật khẩu mới:</p>

    <div>
      <a class="button" href="${fields.link}">Đặt lại mật khẩu</a>
    </div>

    <p>Nếu bạn không yêu cầu, hãy báo ngay cho quản trị đào tạo vì có thể ai đó đang cố truy cập tài khoản của bạn.</p>
    `;

    return getDefaultTemplate(content);
  }
});
