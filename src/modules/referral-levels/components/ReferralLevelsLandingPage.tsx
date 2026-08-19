"use client";

import { motion } from "framer-motion";
import {
  ChartLineUp,
  Users,
  TrendUp,
  Lock,
  LockOpen,
  Calculator,
  Clock,
  Eye,
  Target,
  ArrowRight,
  Stack,
  CheckCircle,
  Percent,
  Wallet,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const turnoverPoints = [
  {
    icon: Stack,
    title: "Your active investments in strategies",
  },
  {
    icon: Users,
    title: "Plus active investments of your direct referrals (1st line)",
  },
];

const turnoverKeyPoints = [
  {
    icon: LockOpen,
    title: "unlocks deeper referral levels",
  },
  {
    icon: TrendUp,
    title: "expands your earning depth",
  },
  {
    icon: ChartLineUp,
    title: "increases your long-term network income",
  },
];

const alwaysActiveLevels = [
  {
    level: 1,
    description: "earnings from your direct referrals",
  },
  {
    level: 2,
    description: "earnings from the second line",
  },
  {
    level: 3,
    description: "earnings from the third line",
  },
];

const earningFactors = [
  {
    icon: Target,
    title: "your current unlocked level",
  },
  {
    icon: Calculator,
    title: "your total Turnover",
  },
];

const unlockConditions = [
  {
    icon: Stack,
    title: "You increase your own active investments",
  },
  {
    icon: Users,
    title: "Your first-line referrals invest more actively",
  },
  {
    icon: TrendUp,
    title: "Your total Turnover reaches a new threshold",
  },
];

const transparencyFeatures = [
  {
    icon: Target,
    title: "your current level",
  },
  {
    icon: Calculator,
    title: "your current Turnover",
  },
  {
    icon: TrendUp,
    title: "progress to the next unlock",
  },
  {
    icon: Clock,
    title: "daily referral earnings",
  },
];

const controlFeatures = [
  {
    icon: Wallet,
    title: "your own investments",
  },
  {
    icon: Users,
    title: "your network growth",
  },
  {
    icon: ChartLineUp,
    title: "your income speed",
  },
];

interface ReferralLevelsLandingPageProps {
  isAuthenticated?: boolean;
}

export function ReferralLevelsLandingPage({ isAuthenticated = false }: ReferralLevelsLandingPageProps) {
  const getStartInvestingHref = () => {
    return isAuthenticated ? "/strategies" : "/auth/email";
  };

  const getSignInHref = () => {
    return isAuthenticated ? "/terminal" : "/auth/email";
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto p-8 md:p-12 lg:p-16 space-y-24 md:space-y-32 lg:space-y-40">
        {/* Hero Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center space-y-6 pt-8 md:pt-16"
        >
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)', border: '1px solid rgba(255, 253, 182, 0.2)' }}>
              <Users size={20} weight="fill" style={{ color: '#FFFDB6' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFDB6' }}>
                Referral Levels
              </span>
            </div>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white-900"
          >
            Referral Levels
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-white-600 max-w-3xl mx-auto"
          >
            Earn deeper as your network turnover grows
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-body text-white-700 max-w-2xl mx-auto leading-relaxed"
          >
            The referral system is built on levels. The higher your total turnover
            — the deeper you earn across the network.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-body text-white-700 max-w-2xl mx-auto leading-relaxed"
          >
            The first levels are available instantly. Deeper levels unlock only
            when specific turnover thresholds are reached.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link href={getStartInvestingHref()}>
              <Button variant="primary" size="lg" className="group">
                Get Started
                <ArrowRight
                  size={20}
                  weight="bold"
                  className="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </Button>
            </Link>
            <Link href={getSignInHref()}>
              <Button variant="secondary" size="lg">
                {isAuthenticated ? "Go to Terminal" : "Sign In"}
              </Button>
            </Link>
          </motion.div>
        </motion.section>

        {/* What Is Turnover */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              What Is Turnover
            </h2>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                  <Wallet size={24} weight="regular" style={{ color: '#FFFDB6' }} />
                </div>
                <div>
                  <p className="text-body text-white-900 mb-2">
                    Turnover is not your wallet balance and not your deposits.
                  </p>
                </div>
              </div>
              <div>
                <p className="text-heading text-white-900 mb-4">
                  Turnover is calculated as:
                </p>
                <div className="space-y-4">
                  {turnoverPoints.map((point, index) => {
                    const Icon = point.icon;
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                          <Icon size={20} weight="regular" style={{ color: '#FFFDB6' }} />
                        </div>
                        <p className="text-body text-white-900 flex-1">{point.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pt-4 border-t border-onsurface-950">
                <p className="text-body text-white-700 mb-4">
                  Only funds that are actively working inside strategies are counted.
                  Wallet balance, deposits, and inactive funds are not included.
                </p>
                <p className="text-heading text-white-900 mb-4">
                  Turnover is the key metric that:
                </p>
                <div className="space-y-3">
                  {turnoverKeyPoints.map((point, index) => {
                    const Icon = point.icon;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <Icon size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                        <p className="text-body text-white-900">{point.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* How Levels Work */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-12"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              How Levels Work
            </h2>
          </motion.div>

          {/* Always Active Levels */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-3">
              <LockOpen size={24} weight="fill" style={{ color: '#FFFDB6' }} />
              <h3 className="text-2xl md:text-3xl font-bold text-white-900">
                Always Active (Levels 1–3)
              </h3>
            </div>
            <div className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950">
              <p className="text-body text-white-700 mb-6">
                The first three levels are available to every user immediately:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {alwaysActiveLevels.map((level) => (
                  <div
                    key={level.level}
                    className="p-6 rounded-xl border border-onsurface-950 text-center"
                    style={{ backgroundColor: 'rgba(255, 253, 182, 0.05)' }}
                  >
                    <div className="text-4xl font-bold mb-2" style={{ color: '#FFFDB6' }}>
                      {level.level}
                    </div>
                    <p className="text-body text-white-900">{level.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-body text-white-700 mt-6">
                You start earning from your network from day one, without conditions.
              </p>
            </div>
          </motion.div>

          {/* Turnover-Based Levels */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-3">
              <Lock size={24} weight="fill" style={{ color: '#FFFDB6' }} />
              <h3 className="text-2xl md:text-3xl font-bold text-white-900">
                Turnover-Based Levels (4–14)
              </h3>
            </div>
            <div className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950">
              <p className="text-body text-white-700 mb-6">
                Levels 4 to 14 unlock only after reaching the required Turnover.
              </p>
              <div className="space-y-4">
                <p className="text-heading text-white-900">
                  Each new turnover threshold:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                    <p className="text-body text-white-900">
                      opens deeper earning levels
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                    <p className="text-body text-white-900">
                      grants access to additional commission percentages
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                    <p className="text-body text-white-900">
                      increases the total earning potential of your network
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-body text-white-700 mt-6">
                The higher your turnover — the deeper and stronger your referral income.
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* How Earnings Are Calculated */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              How Earnings Are Calculated
            </h2>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                    <Percent size={32} weight="regular" style={{ color: '#FFFDB6' }} />
                  </div>
                  <p className="text-body text-white-900">
                    Earnings come only from profits of active strategies
                  </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                    <Clock size={32} weight="regular" style={{ color: '#FFFDB6' }} />
                  </div>
                  <p className="text-body text-white-900">Calculated daily</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                    <ChartLineUp size={32} weight="regular" style={{ color: '#FFFDB6' }} />
                  </div>
                  <p className="text-body text-white-900">
                    You receive a percentage of your network's real trading profit
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-onsurface-950">
                <p className="text-heading text-white-900 mb-4">
                  Your earning depth depends on:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {earningFactors.map((factor, index) => {
                    const Icon = factor.icon;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <Icon size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                        <p className="text-body text-white-900">{factor.title}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-body text-white-700 mt-6">
                  The more active investments inside your structure — the faster your
                  referral income grows.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* How Levels Are Unlocked */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              How Levels Are Unlocked
            </h2>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
          >
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)' }}>
                  <ArrowsClockwise size={24} weight="regular" style={{ color: '#FFFDB6' }} />
                </div>
                <div>
                  <p className="text-heading text-white-900 mb-4">
                    There are no upgrade buttons and no manual activation.
                  </p>
                  <p className="text-body text-white-700 mb-6">
                    Your level grows automatically when:
                  </p>
                  <div className="space-y-4">
                    {unlockConditions.map((condition, index) => {
                      const Icon = condition.icon;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <Icon size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                          <p className="text-body text-white-900">{condition.title}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-6 border-t border-onsurface-950">
                    <p className="text-heading text-white-900 mb-4">
                      The system automatically:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                        <p className="text-body text-white-900">unlocks new levels</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                        <p className="text-body text-white-900">applies higher percentages</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                        <p className="text-body text-white-900">expands your earning depth</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Transparency & Control */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white-900 mb-4">
              Transparency & Control
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* You Always See */}
            <motion.div
              variants={itemVariants}
              className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
            >
              <div className="flex items-center gap-3 mb-6">
                <Eye size={24} weight="fill" style={{ color: '#FFFDB6' }} />
                <h3 className="text-2xl font-bold text-white-900">You always see:</h3>
              </div>
              <div className="space-y-4">
                {transparencyFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <Icon size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                      <p className="text-body text-white-900">{feature.title}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-body text-white-700 mt-6">
                All changes in your structure are reflected in real time.
              </p>
            </motion.div>

            {/* You Fully Control */}
            <motion.div
              variants={itemVariants}
              className="p-8 bg-onsurface-900 rounded-xl border border-onsurface-950"
            >
              <div className="flex items-center gap-3 mb-6">
                <Target size={24} weight="fill" style={{ color: '#FFFDB6' }} />
                <h3 className="text-2xl font-bold text-white-900">You fully control:</h3>
              </div>
              <div className="space-y-4">
                {controlFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <Icon size={20} weight="fill" style={{ color: '#FFFDB6' }} className="flex-shrink-0 mt-0.5" />
                      <p className="text-body text-white-900">{feature.title}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="py-16"
        >
          <motion.div
            variants={itemVariants}
            className="p-8 md:p-12 bg-gradient-to-br from-onsurface-900 to-onsurface-950 rounded-2xl border border-onsurface-950 text-center space-y-6"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: 'rgba(255, 253, 182, 0.1)', border: '1px solid rgba(255, 253, 182, 0.2)' }}
            >
              <Users size={20} weight="fill" style={{ color: '#FFFDB6' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFDB6' }}>
                Ready to build your network?
              </span>
            </motion.div>
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-white-900"
            >
              Start Earning from Your Network
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-body text-white-700 max-w-2xl mx-auto"
            >
              Build your referral network and unlock deeper earning levels as your
              turnover grows.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <Link href={getStartInvestingHref()}>
                <Button variant="primary" size="lg" className="group">
                  Get Started
                  <ArrowRight
                    size={20}
                    weight="bold"
                    className="ml-2 group-hover:translate-x-1 transition-transform"
                  />
                </Button>
              </Link>
              <Link href={getSignInHref()}>
                <Button variant="secondary" size="lg">
                  {isAuthenticated ? "Go to Terminal" : "Sign In"}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}

