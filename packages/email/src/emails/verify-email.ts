import * as z from 'zod';

import { defineEmail } from '../send';
import { getDefaultTemplate } from '../templates';
import { ZEmailBranding } from '../core/branding';

export const verifyEmailEmail = defineEmail({
  id: 'verifyEmail',
  subject: (fields) => (fields.newEmail ? 'Xác nhận đổi email - MP Learning' : 'Xác nhận email của bạn - MP Learning'),
  schema: z.object({
    link: z.url(),
    newEmail: z.email().optional(),
    userName: z.string().optional(),
    orgName: z.string().min(1),
    branding: ZEmailBranding
  }),
  render: (fields) => {
    const isEmailChange = !!fields.newEmail;
    const greeting = fields.userName ? `Chào ${fields.userName},` : 'Chào bạn,';
    const hasOrgBranding = Boolean(fields.branding?.orgName);
    const welcomeLine = hasOrgBranding
      ? `Chào mừng bạn đến với ${fields.orgName}. Vui lòng xác nhận email để bắt đầu sử dụng tài khoản.`
      : 'Vui lòng xác nhận email để bắt đầu sử dụng tài khoản.';

    const content = isEmailChange
      ? `
    <p><strong>${greeting}</strong></p>
    <p>Bạn vừa yêu cầu đổi email đăng nhập sang <strong>${fields.newEmail}</strong>.</p>
    <p>Bấm nút dưới đây để xác nhận thay đổi:</p>
    <div>
      <a class="button" href="${fields.link}">Xác nhận đổi email</a>
    </div>
    <p>Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này.</p>
  `
      : `
    <p><strong>${greeting}</strong></p>
    <p>${welcomeLine}</p>
    <div>
      <a class="button" href="${fields.link}">Xác nhận email</a>
    </div>
  `;

    return getDefaultTemplate(content, fields.branding);
  }
});
