export const ui = $state({
	sidebarOpen: false,
	composerOpen: true
});

export function toggleSidebar() {
	ui.sidebarOpen = !ui.sidebarOpen;
}

export function closeSidebar() {
	ui.sidebarOpen = false;
}
