import {
  Button,
  Divider,
  Drawer,
  DrawerProps,
  InputNumber,
  Select,
  zIndex,
} from "@illa-design/react"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useWindowSize } from "react-use"
import {
  PurchaseItem,
  cancelSubscribe,
  modifySubscribe,
  purchase,
  subscribe,
} from "@/api/billing"
import {
  SUBSCRIBE_PLAN,
  SUBSCRIPTION_CYCLE,
} from "@/illa-public-component/MemberList/interface"
import { pxToRem } from "@/style"
import { isMobileByWindowSize } from "@/utils/screen"
import {
  descriptionStyle,
  drawerContentStyle,
  drawerMaskStyle,
  drawerPaddingStyle,
  drawerStyle,
  manageContentStyle,
  manageItemStyle,
  priceStyle,
  priceTotalLabelStyle,
  priceTotalStyle,
  subTotalStyle,
  titleStyle,
} from "./style"

interface DrawerSubscribeInfo {
  plan: SUBSCRIBE_PLAN
  currentPlan?: SUBSCRIBE_PLAN
  cycle: SUBSCRIPTION_CYCLE
  quantity: number
}

export type DrawerType = "license" | "storage" | "traffic"

export interface DrawerDefaultConfig {
  type: DrawerType
  subscribeInfo?: DrawerSubscribeInfo
  purchaseInfo?: {
    item: PurchaseItem
    quantity: number
  }
  onSubscribeCallback?: () => void
}

interface UpgradeDrawerProps extends DrawerProps {
  defaultConfig: DrawerDefaultConfig
}

const ConfigKey = {
  license: {
    title: "billing.payment_sidebar.title.manage_licenses",
    manageLabel: "billing.payment_sidebar.plan_label.License",
  },
  storage: {
    title: "billing.modal.storage_insufficient.not_owner_title",
    manageLabel: "billing.payment_sidebar.plan_label.Storage",
  },
  traffic: {
    title: "billing.modal.traffic_insufficient.not_owner_title",
    manageLabel: "billing.payment_sidebar.plan_label.Traffic",
  },
}

export const subscribeUnitPrice = {
  license: {
    [SUBSCRIPTION_CYCLE.FREE]: 0,
    [SUBSCRIPTION_CYCLE.MONTHLY]: 10,
    [SUBSCRIPTION_CYCLE.YEARLY]: 100,
  },
  storage: {
    [SUBSCRIPTION_CYCLE.FREE]: 0,
    [SUBSCRIPTION_CYCLE.MONTHLY]: 0.99,
    [SUBSCRIPTION_CYCLE.YEARLY]: 9.99,
  },
  traffic: {
    [PurchaseItem.DRIVE_TRAFFIC_1GB]: 0.99,
  },
}

const isSubscribe = (subscribePlan?: SUBSCRIBE_PLAN) => {
  return (
    subscribePlan === SUBSCRIBE_PLAN.TEAM_LICENSE_PLUS ||
    subscribePlan === SUBSCRIBE_PLAN.TEAM_LICENSE_ENTERPRISE ||
    subscribePlan === SUBSCRIBE_PLAN.TEAM_LICENSE_INSUFFICIENT ||
    subscribePlan === SUBSCRIBE_PLAN.DRIVE_VOLUME_PAID ||
    subscribePlan === SUBSCRIBE_PLAN.DRIVE_VOLUME_INSUFFICIENT
  )
}
// 函数：判断订阅的数量是否为0
const isCancelSubscribe = (quantity: number) => quantity === 0

// 函数：判断是否减少了数量
const isQuantityDecreased = (
  quantity: number,
  subscribeInfo: DrawerSubscribeInfo,
) => quantity < subscribeInfo.quantity

const subscriptionStatus = {
  unknown: "Unknown Subscription Status",
  un_changed: "Subscription has not been changed",
  subscribed_cancelled: "Subscription has been cancelled",
  subscribed_plan_decreased_with_update:
    "Subscription plan has been updated with decreased quantity",
  subscribed_plan_increased_with_update:
    "Subscription plan has been updated with increased quantity",
  subscribed_quantity_decreased:
    "Subscription quantity has been decreased without plan update",
  subscribed_quantity_increased:
    "Subscription quantity has been increased without plan update",
  subscribed_yearly: "Subscription has been switched to yearly",
  subscribed_monthly: "Subscription has been switched to monthly",
  traffic_added: "Additional traffic has been subscribed",
}

const getSubscriptionStatus = (
  defaultConfig: DrawerDefaultConfig,
  quantity: number,
  cycle: SUBSCRIPTION_CYCLE,
) => {
  const { type, subscribeInfo } = defaultConfig

  switch (type) {
    case "license":
    case "storage":
      if (!subscribeInfo) return "unknown"
      if (
        subscribeInfo.quantity === quantity &&
        subscribeInfo.cycle === cycle
      ) {
        return "un_changed"
      }
      if (isSubscribe(subscribeInfo?.currentPlan)) {
        if (isCancelSubscribe(quantity)) {
          return "subscribed_cancelled"
        } else if (cycle !== subscribeInfo.cycle) {
          if (isQuantityDecreased(quantity, subscribeInfo)) {
            return "subscribed_plan_decreased_with_update"
          } else {
            return "subscribed_plan_increased_with_update"
          }
        } else {
          if (isQuantityDecreased(quantity, subscribeInfo)) {
            return "subscribed_quantity_decreased"
          } else {
            return "subscribed_quantity_increased"
          }
        }
      } else {
        if (cycle === SUBSCRIPTION_CYCLE.YEARLY) {
          return "subscribed_yearly"
        } else {
          return "subscribed_monthly"
        }
      }
    case "traffic":
      return "traffic_added"
    default:
      return "unknown"
  }
}

export const UpgradeDrawer: FC<UpgradeDrawerProps> = (props) => {
  const {
    defaultConfig = {
      type: "license",
    },
    onCancel,
    ...otherProps
  } = props
  const { t } = useTranslation()

  const { width } = useWindowSize()
  const isMobile = isMobileByWindowSize(width)

  const [cycle, setCycle] = useState<SUBSCRIPTION_CYCLE>(
    SUBSCRIPTION_CYCLE.MONTHLY,
  )
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)

  const { title, manageLabel } = useMemo(() => {
    return ConfigKey[defaultConfig?.type ?? "license"]
  }, [defaultConfig?.type])

  const unitPrice = useMemo(() => {
    if (defaultConfig?.type === "traffic")
      return subscribeUnitPrice[defaultConfig?.type][
        defaultConfig?.purchaseInfo?.item ?? PurchaseItem.DRIVE_TRAFFIC_1GB
      ]
    return subscribeUnitPrice[defaultConfig?.type][
      cycle ?? SUBSCRIPTION_CYCLE.MONTHLY
    ]
  }, [defaultConfig.type, defaultConfig.purchaseInfo?.item, cycle])

  const paymentOptions = [
    {
      label: t("billing.payment_sidebar.select_option.Yearly"),
      value: SUBSCRIPTION_CYCLE.YEARLY,
    },
    {
      label: t("billing.payment_sidebar.select_option.Monthly"),
      value: SUBSCRIPTION_CYCLE.MONTHLY,
    },
  ]

  const priceLabel = useMemo(() => {
    const translateKey = {
      unitPrice: "$" + unitPrice,
      licenseNum: quantity,
      storageNum: quantity,
      trafficNum: quantity,
    }
    switch (defaultConfig.type) {
      case "license":
        return cycle === SUBSCRIPTION_CYCLE.YEARLY
          ? t(
              "billing.payment_sidebar.price_cal.next_period_yearly",
              translateKey,
            )
          : t(
              "billing.payment_sidebar.price_cal.next_period_monthly",
              translateKey,
            )
      case "storage":
        return cycle === SUBSCRIPTION_CYCLE.YEARLY
          ? t(
              "billing.payment_sidebar.price_cal.next_period_yearly_remove_storage",
              translateKey,
            )
          : t(
              "billing.payment_sidebar.price_cal.next_period_monthly_remove_storage",
              translateKey,
            )
      case "traffic":
        return t(
          "billing.payment_sidebar.price_type.payment_description_traffic",
          translateKey,
        )
      default:
        return ""
    }
  }, [defaultConfig.type, unitPrice, cycle, quantity, t])

  const unChanged = useMemo(() => {
    const subscribeInfo = defaultConfig.subscribeInfo
    const purchaseInfo = defaultConfig.purchaseInfo
    switch (defaultConfig.type) {
      case "license":
      case "storage":
        return (
          subscribeInfo?.quantity === quantity && subscribeInfo?.cycle === cycle
        )
      case "traffic":
        return false
      default:
        return false
    }
  }, [
    defaultConfig.type,
    defaultConfig?.subscribeInfo,
    defaultConfig?.purchaseInfo,
    quantity,
    cycle,
  ])

  const description = useMemo(() => {
    const { type } = defaultConfig
    const statusLabel = {
      unknown: "",
      un_changed: "",
      subscribed_cancelled: t(
        `billing.payment_sidebar.description_title.unsubscribe_${type}`,
      ),
      subscribed_plan_decreased_with_update: t(
        `billing.payment_sidebar.description_title.update_plan_remove_${type}`,
      ),
      subscribed_plan_increased_with_update: t(
        `billing.payment_sidebar.description_title.update_plan_increase_${type}`,
      ),
      subscribed_quantity_decreased: t(
        `billing.payment_sidebar.description_title.remove_${type}`,
      ),
      subscribed_quantity_increased: t(
        `billing.payment_sidebar.description_title.add_${type}`,
      ),
      subscribed_yearly: t(
        `billing.payment_sidebar.description_title.subscribe_${type}_yearly`,
      ),
      subscribed_monthly: t(
        `billing.payment_sidebar.description_title.subscribe_${type}_monthly`,
      ),
      traffic_added: t("billing.payment_sidebar.description_title.add_traffic"),
    }
    const status = getSubscriptionStatus(defaultConfig, quantity, cycle)
    return statusLabel[status] ?? ""
  }, [defaultConfig, quantity, cycle, t])

  const quantityFormatter = useCallback(
    (value: number | string) => {
      switch (defaultConfig?.type) {
        case "license":
          return `${value} ${t(
            "billing.payment_sidebar.plan_number_input_label.License",
          )}`
        case "storage":
          return `${value} ${t(
            "billing.payment_sidebar.plan_number_input_label.Storage_traffic",
          )}`
        case "traffic":
          return `${value} ${t(
            "billing.payment_sidebar.plan_number_input_label.Storage_traffic",
          )}`
        default:
          return `${value}`
      }
    },
    [defaultConfig?.type, t],
  )

  const handleSubscribe = async () => {
    const { type, subscribeInfo, purchaseInfo } = defaultConfig
    if (loading) return
    setLoading(true)

    try {
      if (type === "traffic") {
        const res = await purchase({
          item: purchaseInfo?.item ?? PurchaseItem.DRIVE_TRAFFIC_1GB,
          quantity,
          successRedirect: window.location.href,
          cancelRedirect: window.location.href,
        })
        console.log(res, "purchase res")
        if (res.data.url) {
          window.open(res.data.url, "_blank")
        }
      } else {
        if (
          subscribeInfo?.currentPlan &&
          isSubscribe(subscribeInfo?.currentPlan)
        ) {
          if (quantity === 0) {
            const res = await cancelSubscribe(subscribeInfo?.currentPlan)
            console.log(res, "cancelSubscribe res")
            defaultConfig?.onSubscribeCallback?.()
          } else {
            const res = await modifySubscribe({
              plan: subscribeInfo?.plan ?? SUBSCRIBE_PLAN.TEAM_LICENSE_PLUS,
              quantity,
              cycle,
            })
            console.log(res, "modifySubscribe res")
            defaultConfig?.onSubscribeCallback?.()
          }
        } else {
          const res = await subscribe({
            plan: subscribeInfo?.plan ?? SUBSCRIBE_PLAN.TEAM_LICENSE_PLUS,
            quantity,
            cycle,
            successRedirect: window.location.href,
            cancelRedirect: window.location.href,
          })
          console.log(res, "subscribe res")
          if (res.data.url) {
            window.open(res.data.url, "_blank")
          }
        }
      }
    } catch (error) {
      console.error("An error occurred while subscribe:", error)
    } finally {
      setLoading(false)
    }
  }

  console.log(defaultConfig, "defaultConfig")

  useEffect(() => {
    switch (defaultConfig?.type) {
      case "license":
      case "storage":
        if (defaultConfig?.subscribeInfo) {
          setCycle(defaultConfig.subscribeInfo.cycle)
          setQuantity(defaultConfig.subscribeInfo.quantity)
        }
        break
      case "traffic":
        if (defaultConfig?.purchaseInfo) {
          setQuantity(defaultConfig.purchaseInfo.quantity)
        }
        break
      default:
        break
    }
  }, [
    defaultConfig?.subscribeInfo,
    defaultConfig?.purchaseInfo,
    defaultConfig?.type,
  ])

  console.log({ cycle, quantity }, "cycle, quantity")

  return (
    <Drawer
      css={drawerStyle}
      w={isMobile ? "100%" : "520px"}
      placement={isMobile ? "bottom" : "right"}
      maskStyle={drawerMaskStyle}
      // closable={false}
      footer={false}
      onCancel={onCancel}
      {...otherProps}
    >
      <div css={drawerContentStyle}>
        <div>
          <div css={drawerPaddingStyle}>
            <div css={titleStyle}>{t(title)}</div>
            <div css={manageContentStyle}>
              <label>{t(manageLabel)}</label>
              <div css={manageItemStyle}>
                {defaultConfig?.type === "traffic" ? null : (
                  <Select
                    w="auto"
                    colorScheme="techPurple"
                    value={cycle}
                    options={paymentOptions}
                    dropdownProps={{ triggerProps: { zIndex: zIndex.drawer } }}
                    onChange={(value) => {
                      setCycle(value as SUBSCRIPTION_CYCLE)
                    }}
                  />
                )}
                <InputNumber
                  mode="button"
                  colorScheme="techPurple"
                  value={quantity}
                  onChange={setQuantity}
                  // formatter={quantityFormatter}
                  min={
                    defaultConfig.type === "traffic"
                      ? defaultConfig.purchaseInfo?.quantity ?? 0
                      : 0
                  }
                />
              </div>
            </div>
          </div>
          <Divider />
          <div css={drawerPaddingStyle}>
            <div css={subTotalStyle}>
              <div>{t("billing.payment_sidebar.price_label.total")}</div>
              <div css={priceStyle}>
                <div css={priceTotalStyle}>
                  ${(unitPrice * quantity).toFixed(2)}
                </div>
                <div css={priceTotalLabelStyle}>{priceLabel}</div>
              </div>
            </div>
            <Button
              w="100%"
              size="large"
              colorScheme="blackAlpha"
              disabled={unChanged}
              loading={loading}
              mt={isMobile ? pxToRem(32) : "16px"}
              onClick={handleSubscribe}
            >
              Subscribe
            </Button>
          </div>
        </div>
        <div css={drawerPaddingStyle}>
          <div css={descriptionStyle}>{description}</div>
        </div>
      </div>
    </Drawer>
  )
}

UpgradeDrawer.displayName = "UpgradeDrawer"
