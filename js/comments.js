const section = document.querySelector('.blog-comments');
if (section) {
  const button = section.querySelector('.comments-load');
  const status = section.querySelector('.comments-status');
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Loading discussion…';
    try {
      const endpoint = new URL('/api/comment', section.dataset.server);
      endpoint.searchParams.set('path', section.dataset.path);
      endpoint.searchParams.set('pageSize', '1');
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Comments unavailable');
      const result = await response.json();
      if (result.errno !== 0) throw new Error('Comments unavailable');
      const { init } = await import('../vendor/waline/3.15.2/waline.js');
      init({
        el: '#waline', serverURL: section.dataset.server,
        path: section.dataset.path, lang: 'en', dark: true,
        login: 'disable', meta: ['nick'], requiredMeta: ['nick'],
        reaction: ['like', 'insightful', 'funny', 'curious'].map(
          name => new URL(`../images/reactions/${name}.svg`, import.meta.url).href),
        locale: {
          reactionTitle: 'What did you think?',
          reaction0: 'Liked it', reaction1: 'Insightful',
          reaction2: 'Made me laugh', reaction3: 'Tell me more',
          placeholder: 'Your thoughts? Comments appear after moderation.',
        },
        emoji: false, search: false, imageUploader: false,
        texRenderer: false, highlighter: false, pageview: false,
      });
      status.textContent = '';
      button.hidden = true;
    } catch (error) {
      status.textContent = 'Discussion is temporarily unavailable. Please try again later.';
      button.textContent = 'Try again';
    } finally { button.disabled = false; }
  });
}
