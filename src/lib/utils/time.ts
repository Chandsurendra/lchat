export function timeAgo(date: string | Date): string {
	const then = typeof date === 'string' ? new Date(date) : date;
	const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
	if (seconds < 45) return 'now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return formatDate(then);
}

export function formatTime(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
	const da = typeof a === 'string' ? new Date(a) : a;
	const db = typeof b === 'string' ? new Date(b) : b;
	return (
		da.getFullYear() === db.getFullYear() &&
		da.getMonth() === db.getMonth() &&
		da.getDate() === db.getDate()
	);
}

export function dayLabel(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	const yesterday = new Date(today.getTime() - 86400000);
	if (isSameDay(d, today)) return 'Today';
	if (isSameDay(d, yesterday)) return 'Yesterday';
	return formatDate(d);
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
