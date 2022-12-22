import {useContext, useEffect, useRef} from 'react'

import PropTypes from 'prop-types'
import * as reporter from 'web-vitals'

import SUIContext from '@s-ui/react-context'
import useMount from '@s-ui/react-hooks/lib/useMount/index.js'
import {useRouter} from '@s-ui/react-router'

export const METRICS = {
  TTFB: 'TTFB',
  LCP: 'LCP',
  CLS: 'CLS',
  FID: 'FID',
  INP: 'INP',
  FCP: 'FCP'
}

export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile'
}

export default function WebVitalsReporter({
  metrics = Object.values(METRICS),
  pathnames,
  deviceType,
  onReport,
  children
}) {
  const {logger, browser} = useContext(SUIContext)
  const router = useRouter()
  const onReportRef = useRef(onReport)

  useEffect(() => {
    onReportRef.current = onReport
  }, [onReport])

  useMount(() => {
    const getPathname = () => {
      const {routes} = router
      const route = routes[routes.length - 1]
      return route?.path || route?.regexp?.toString()
    }

    const getDeviceType = () => {
      return deviceType || browser?.deviceType
    }

    const handleReport = ({name, value}) => {
      const onReport = onReportRef.current
      const pathname = getPathname()
      const type = getDeviceType()
      const isExcluded =
        !pathname || (Array.isArray(pathnames) && !pathnames.includes(pathname))

      if (isExcluded) {
        return
      }

      if (onReport) {
        onReport({
          name,
          amount: value,
          pathname,
          type
        })
        return
      }

      if (!logger?.timing) {
        return
      }

      logger.timing({
        name,
        amount: value,
        tags: [
          {
            key: 'pathname',
            value: pathname
          },
          ...(type
            ? [
                {
                  key: 'type',
                  value: type
                }
              ]
            : [])
        ]
      })
    }

    metrics.forEach(metric => {
      reporter[`on${metric}`](handleReport)
    })
  })

  return children
}

WebVitalsReporter.propTypes = {
  /**
   * An optional array of core web vitals. Choose between: TTFB, LCP, FID, CLS and INP. Defaults to all.
   */
  metrics: PropTypes.arrayOf(PropTypes.oneOf(Object.values(METRICS))),
  /**
   * An optional string to identify the device type. Choose between: desktop, tablet and mobile
   */
  deviceType: PropTypes.oneOf(Object.values(DEVICE_TYPES)),
  /**
   * An optional array of pathnames that you want to track
   */
  pathnames: PropTypes.arrayOf(PropTypes.string),
  /**
   * An optional callback to be used to track core web vitals
   */
  onReport: PropTypes.func,
  /**
   * An optional children node
   */
  children: PropTypes.node
}
