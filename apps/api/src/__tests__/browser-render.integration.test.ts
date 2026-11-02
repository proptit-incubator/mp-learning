import { describe, expect, it } from 'vitest';

const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH;
const integration = chromiumPath ? describe : describe.skip;

integration('local certificate rendering with Chromium', () => {
  let rendering: typeof import('@api/utils/certificate');

  async function renderInput() {
    rendering ??= await import('@api/utils/certificate');
    const { resolveCertificateDesign } = await import('@cio/certificates');
    return {
      design: resolveCertificateDesign({ design: { templateId: 'mp' } }),
      data: {
        recipientName: 'Nguyễn Thị Hằng',
        courseName: 'An toàn thông tin',
        courseDescription: '',
        orgName: 'MP Transformation',
        date: '03/11/2026',
        certificateId: 'K7QX2M9DPA',
        verifyUrl: 'https://learning.example.vn/verify/K7QX2M9DPA'
      }
    };
  }

  it('renders a certificate PDF and PNG without calling an external service', async () => {
    const input = await renderInput();

    const pdf = await rendering.generateCertificatePdf(input);
    const png = await rendering.generateCertificatePng(input);

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  }, 60000);
});
