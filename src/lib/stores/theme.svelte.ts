export const theme = $state({ dark: false });

export function initTheme() {
	if (typeof window === 'undefined') return;
	const stored = localStorage.getItem('theme');
	theme.dark =
		stored === 'dark' ||
		(stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
	applyTheme();
}

export function toggleTheme() {
	theme.dark = !theme.dark;
	localStorage.setItem('theme', theme.dark ? 'dark' : 'light');
	applyTheme();
}

export function applyTheme() {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', theme.dark);
}
