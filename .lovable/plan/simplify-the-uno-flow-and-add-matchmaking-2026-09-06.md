# Simplify the UNO flow and add matchmaking

## What will change
- Strip the landing page down to the UNO title, the 3D cards, and one clear Play button; remove the feature boxes and extra promotional copy.
- Redesign the play screen around two clear choices: **Invite Friends** for a private room and **Quick Match** for a public lobby with unknown players.
- Build a compact, mobile-friendly waiting lobby inspired by squad-game lobbies: visible player slots, room status, invite/copy action for private rooms, and automatic start when a public room reaches its selected size.
- Make played cards feel instant by updating the local screen immediately, reducing animation delays, and avoiding full room reloads for every live update.
- Keep the existing night-sky artwork behind the play, lobby, and table screens while preserving the current 3D landing scene.

## Technical details
- Add a game visibility/matchmaking field and an atomic database function that joins an available public lobby or creates one, preventing two players from claiming the same seat.
- Replace broad realtime callbacks with row-level state updates and an immediate local optimistic state change for card actions.
- Tighten animation durations and remove staggered animations that replay whenever room data changes.
- Preserve 2–6 player support, existing invitation links, UNO rules, and current card artwork.

## Verification
- Test private room creation and invite joining with two browser sessions.
- Test quick match joining from separate browser sessions and automatic game start at the chosen player count.
- Confirm a card disappears from the player hand immediately after tapping, remote players receive the update, and the layout remains usable on a phone-sized screen.
