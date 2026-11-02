<script lang="ts">
  import type { CertificateTemplateId } from '@cio/certificates';

  interface Props {
    id: CertificateTemplateId;
  }

  let { id }: Props = $props();
</script>

{#if id === 'mp'}
  <div class="relative h-full w-full overflow-hidden bg-white">
    <svg class="absolute top-0 right-0 h-full" viewBox="0 0 60 60" aria-hidden="true">
      <polygon points="60,0 42,0 60,28" fill="#0e2259" />
      <polygon points="42,0 28,0 60,44 60,28" fill="#1559c6" />
      <polygon points="28,0 18,0 54,60 60,60 60,44" fill="#0ea5e0" />
      <polygon points="18,0 12,0 44,60 54,60" fill="#6cc9f2" />
    </svg>
    <div class="relative flex h-full flex-col justify-center pl-2" style="font-family:'Be Vietnam Pro',sans-serif">
      <span class="text-[5px] font-bold tracking-[0.3em] text-[#1559c6]">CHỨNG NHẬN</span>
      <span class="text-[12px] leading-tight font-extrabold text-[#0e2259]">MP</span>
    </div>
    <span class="absolute right-0 bottom-0 left-0 h-[3px] bg-gradient-to-r from-[#0e2259] via-[#0ea5e0] to-[#6cc9f2]"
    ></span>
  </div>
{:else if id === 'classique'}
  <div class="flex h-full w-full flex-col items-center justify-center bg-[#faf6ec] text-[#6b4513]">
    <span class="text-[18px] italic" style="font-family:'Noto Serif Display',serif">Classique</span>
    <span class="mt-1 text-[6px] tracking-[0.3em]" style="font-family:'Cormorant SC',serif">— EST 1892 —</span>
  </div>
{:else if id === 'brutalist'}
  <div class="flex h-full w-full items-end justify-start bg-[#f0ede4] p-2">
    <div
      class="w-full text-left leading-[0.85] text-black"
      style="font-family:'Archivo',sans-serif;font-weight:900;font-size:18px"
    >
      RAW<br />
      <span class="text-[#ff4500] italic" style="font-family:'Playfair Display',serif;font-weight:400">form</span>
    </div>
  </div>
{:else if id === 'noir'}
  <div class="flex h-full w-full flex-col items-center justify-center bg-[#0e0e0e] text-[#d4af37]">
    <span class="text-[16px] text-[#f5f1e8] italic" style="font-family:'Playfair Display',serif">Noir</span>
    <span class="mt-1 text-[6px] tracking-[0.3em]" style="font-family:'Cormorant SC',serif">★ ATELIER ★</span>
  </div>
{:else if id === 'poster'}
  <div class="relative h-full w-full overflow-hidden bg-[#fef2dc]">
    <span class="absolute -top-3 -right-4 h-10 w-10 rounded-full bg-[#ff5722]"></span>
    <span class="absolute -bottom-3 -left-3 h-9 w-9 rounded-full bg-[#1e3a8a]"></span>
    <div class="relative z-10 flex h-full w-full items-center justify-center">
      <span class="font-black italic" style="font-family:'Playfair Display',serif;font-size:18px">Poster</span>
    </div>
  </div>
{:else}
  <div class="flex h-full w-full flex-col items-center justify-center bg-white text-black">
    <span class="text-[18px] font-light italic" style="font-family:'Cormorant Garamond',serif">Minimal</span>
    <span class="mt-1 block h-px w-7 bg-black"></span>
    <span class="mt-1 text-[6px] tracking-[0.3em]" style="font-family:'JetBrains Mono',monospace">N°001</span>
  </div>
{/if}
