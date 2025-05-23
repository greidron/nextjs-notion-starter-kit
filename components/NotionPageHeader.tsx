import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import { GoHubot } from '@react-icons/all-files/go/GoHubot'
import cs from 'classnames'
import * as React from 'react'
import { Header, Search, useNotionContext } from 'react-notion-x'

import type * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Breadcrumbs } from './Breadcrumbs'
import styles from './styles.module.css'

function ToggleThemeButton() {
  const [hasMounted, setHasMounted] = React.useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const onToggleTheme = React.useCallback(() => {
    toggleDarkMode()
  }, [toggleDarkMode])

  return (
    <div
      className={cs('breadcrumb', 'button', !hasMounted && styles.hidden)}
      onClick={onToggleTheme}
    >
      {hasMounted && isDarkMode ? <IoMoonSharp /> : <IoSunnyOutline />}
    </div>
  )
}

export function NotionPageHeader({
  site, block
}: {
  site: types.Site,
  block: types.CollectionViewPageBlock | types.PageBlock
}) {
  const { components, mapPageUrl } = useNotionContext()
  const {
    isSearchEnabled,
    isAgentEnabled,
    rootNotionPageId,
    navigationStyle,
    navigationLinks,
    navigationPageIds,
  } = site

  if (navigationStyle === 'default') {
    return <Header block={block} />
  }

  return (
    <header className='notion-header'>
      <div className='notion-nav-header'>
        <Breadcrumbs
          block={block}
          rootPageId={rootNotionPageId}
          navigationPageIds={navigationPageIds}
        />

        <div className='notion-nav-header-rhs breadcrumbs'>
          {navigationLinks
            ?.map((link, index) => {
              if (!link.pageId && !link.url) {
                return null
              }

              if (link.pageId) {
                return (
                  <components.PageLink
                    href={mapPageUrl(link.pageId)}
                    key={index}
                    className={cs(styles.navLink, 'breadcrumb', 'button')}
                  >
                    {link.title}
                  </components.PageLink>
                )
              } else {
                return (
                  <components.Link
                    href={link.url}
                    key={index}
                    className={cs(styles.navLink, 'breadcrumb', 'button')}
                  >
                    {link.title}
                  </components.Link>
                )
              }
            })
            .filter(Boolean)}

          <ToggleThemeButton />

          {isSearchEnabled && <Search block={block} title={null} />}
          {
            isAgentEnabled && (
              <components.PageLink
                href="/agent"
                key="agent"
                className={cs(styles.navLink, 'breadcrumb', 'button')}
              >
                <GoHubot />
              </components.PageLink>
            )
          }
        </div>
      </div>
    </header>
  )
}
