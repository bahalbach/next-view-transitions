import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback } from "react";
import { useSetFinishViewTransition } from "./transition-context";

// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L180-L191
function isModifiedEvent(event: React.MouseEvent): boolean {
  const eventTarget = event.currentTarget as HTMLAnchorElement | SVGAElement;
  const target = eventTarget.getAttribute("target");
  return (
    (target && target !== "_self") ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey || // triggers resource download
    (event.nativeEvent && event.nativeEvent.which === 2)
  );
}

// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L204-L217
function shouldPreserveDefault(
  e: React.MouseEvent<HTMLAnchorElement>
): boolean {
  const { nodeName } = e.currentTarget;

  // anchors inside an svg have a lowercase nodeName
  const isAnchorNodeName = nodeName.toUpperCase() === "A";

  if (isAnchorNodeName && isModifiedEvent(e)) {
    // ignore click for browser’s default behavior
    return true;
  }

  return false;
}

// This is a wrapper around next/link that explicitly uses the router APIs
// to navigate, and trigger a view transition.

export function Link(props: React.ComponentProps<typeof NextLink>) {
  const router = useRouter();
  const finishViewTransition = useSetFinishViewTransition();

  const { href, as, replace, scroll, shallow, className, children } = props;
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (props.onClick) {
        props.onClick(e);
      }

      const [nonHashUrl = "", hash = ""] = href.split("#", 2);
      if ("startViewTransition" in document && nonHashUrl !== "") {
        if (shouldPreserveDefault(e)) {
          return;
        }

        e.preventDefault();

        // @ts-ignore
        document.startViewTransition(
          () =>
            new Promise<void>((resolve) => {
              startTransition(() => {
                if (shallow) {
                  window.history[`${replace ? "replace" : "push"}State`](
                    null,
                    "",
                    href
                  );
                } else {
                  // copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L231-L233
                  router[replace ? "replace" : "push"](as || href, {
                    scroll: scroll ?? true,
                  });
                }
                finishViewTransition(() => resolve);
              });
            })
        );
      } else if (shallow) {
        e.preventDefault();
        window.history[`${replace ? "replace" : "push"}State`](null, "", href);
        if (hash === "" || hash === "top") {
          window.scrollTo(0, 0);
          return;
        }
        // Decode hash to make non-latin anchor works.
        const rawHash = decodeURIComponent(hash);
        // First we check if the element by id is found
        const idEl = document.getElementById(rawHash);
        if (idEl) {
          idEl.scrollIntoView();
          return;
        }
        // If there's no element with the id, we check the `name` property
        // To mirror browsers
        const nameEl = document.getElementsByName(rawHash)[0];
        if (nameEl) {
          nameEl.scrollIntoView();
        }
      }
    },
    [props.onClick, href, as, replace, scroll]
  );
  if (shallow) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return <NextLink {...props} onClick={onClick} />;
}
