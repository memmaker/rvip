/* xsend <window-id> <keys...>: send key presses to ONE X window only.
 * Each arg is a keysym name (Return, Escape, space, a, A, less, ...) or,
 * prefixed with ':', a literal string typed char by char; C-x = Ctrl+x. */
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static unsigned int mods;   /* C-<key>: Control */
static void send(Display *d, Window w, KeySym ks)
{
	XKeyEvent e;
	KeyCode kc = XKeysymToKeycode(d, ks);
	unsigned int state = 0;
	if (!kc) { fprintf(stderr, "no keycode for %lu\n", ks); return; }
	if (XKeycodeToKeysym(d, kc, 0) != ks && XKeycodeToKeysym(d, kc, 1) == ks) state = ShiftMask;
	memset(&e, 0, sizeof e);
	e.display = d; e.window = w; e.root = DefaultRootWindow(d); e.subwindow = None;
	e.time = CurrentTime; e.same_screen = True; e.keycode = kc; e.state = state | mods;
	e.type = KeyPress; XSendEvent(d, w, True, KeyPressMask, (XEvent *)&e);
	e.type = KeyRelease; XSendEvent(d, w, True, KeyReleaseMask, (XEvent *)&e);
	XFlush(d); usleep(60000);
}
int main(int argc, char **argv)
{
	Display *d = XOpenDisplay(NULL);
	Window w; int i;
	if (!d || argc < 3) return 1;
	w = strtoul(argv[1], NULL, 0);
	for (i = 2; i < argc; i++)
	{
		if (argv[i][0] == ':')
		{
			char *p; char b[2] = {0, 0};
			for (p = argv[i] + 1; *p; p++) { b[0] = *p; send(d, w, *p == ' ' ? XK_space : XStringToKeysym(b)); }
		}
		else if (!strncmp(argv[i], "C-", 2)) { mods = ControlMask; send(d, w, XStringToKeysym(argv[i] + 2)); mods = 0; }
		else send(d, w, XStringToKeysym(argv[i]));
	}
	XCloseDisplay(d);
	return 0;
}
