import type { ComponentProps } from "react"
import { Link } from "react-router"

/** Link React Router qui active le View Transition API quand le navigateur le permet. */
export function TransitionLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} viewTransition />
}
