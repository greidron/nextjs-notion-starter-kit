import { FaEnvelopeOpenText } from '@react-icons/all-files/fa/FaEnvelopeOpenText'
import { FaGithub } from '@react-icons/all-files/fa/FaGithub'
import { FaLinkedin } from '@react-icons/all-files/fa/FaLinkedin'
import { FaMastodon } from '@react-icons/all-files/fa/FaMastodon'
import { FaTwitter } from '@react-icons/all-files/fa/FaTwitter'
import { FaYoutube } from '@react-icons/all-files/fa/FaYoutube'
import { FaZhihu } from '@react-icons/all-files/fa/FaZhihu'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import * as React from 'react'

import { type SocialAccounts } from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

import styles from './styles.module.css'

const getMastodonHandle = (mastodon?: string): string | null => {
  if (!mastodon) {
    return null
  }

  // Since Mastodon is decentralized, handles include the instance domain name.
  // e.g. @example@mastodon.social
  const url = new URL(mastodon)
  return `${url.pathname.slice(1)}@${url.hostname}`
}

export function FooterImpl({ 
  author, 
  copyright, 
  socialAccounts
 } : {
  author: string
  copyright: string
  socialAccounts: SocialAccounts
 }) {
  const [hasMounted, setHasMounted] = React.useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  const onToggleDarkMode = React.useCallback(
    (e) => {
      e.preventDefault()
      toggleDarkMode()
    },
    [toggleDarkMode]
  )

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <footer className={styles.footer}>
      <div className={styles.copyright}>{copyright}</div>

      <div className={styles.settings}>
        {hasMounted && (
          <a
            className={styles.toggleDarkMode}
            href='#'
            role='button'
            onClick={onToggleDarkMode}
            title='Toggle dark mode'
          >
            {isDarkMode ? <IoMoonSharp /> : <IoSunnyOutline />}
          </a>
        )}
      </div>

      <div className={styles.social}>
        {socialAccounts?.twitter && (
          <a
            className={styles.twitter}
            href={`https://twitter.com/${socialAccounts.twitter}`}
            title={`Twitter @${socialAccounts.twitter}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaTwitter />
          </a>
        )}

        {socialAccounts?.mastodon && (
          <a
            className={styles.mastodon}
            href={socialAccounts.mastodon}
            title={`Mastodon ${getMastodonHandle(socialAccounts.mastodon)}`}
            rel='me'
          >
            <FaMastodon />
          </a>
        )}

        {socialAccounts?.zhihu && (
          <a
            className={styles.zhihu}
            href={`https://zhihu.com/people/${socialAccounts.zhihu}`}
            title={`Zhihu @${socialAccounts.zhihu}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaZhihu />
          </a>
        )}

        {socialAccounts?.github && (
          <a
            className={styles.github}
            href={`https://github.com/${socialAccounts.github}`}
            title={`GitHub @${socialAccounts.github}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaGithub />
          </a>
        )}

        {socialAccounts?.linkedin && (
          <a
            className={styles.linkedin}
            href={`https://www.linkedin.com/in/${socialAccounts.linkedin}`}
            title={`LinkedIn ${author}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaLinkedin />
          </a>
        )}

        {socialAccounts?.newsletter && (
          <a
            className={styles.newsletter}
            href={`${socialAccounts.newsletter}`}
            title={`Newsletter ${author}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaEnvelopeOpenText />
          </a>
        )}

        {socialAccounts?.youtube && (
          <a
            className={styles.youtube}
            href={`https://www.youtube.com/${socialAccounts.youtube}`}
            title={`YouTube ${author}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <FaYoutube />
          </a>
        )}
      </div>
    </footer>
  )
}

export const Footer = React.memo(FooterImpl)
