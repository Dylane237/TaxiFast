import {
  IconArrowDownRight,
  IconReceipt,
  IconWallet,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type WalletTransaction } from "@/api";
import { EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

function TransactionRow({ item }: { item: WalletTransaction }) {
  const commission = item.type === "COMMISSION";
  return (
    <View style={styles.transaction}>
      <View
        style={[styles.transactionIcon, commission && styles.commissionIcon]}
      >
        {commission ? (
          <IconReceipt color={couleurs.attention} size={19} />
        ) : (
          <IconArrowDownRight color={couleurs.succes} size={19} />
        )}
      </View>
      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle}>
          {commission
            ? "Commission plateforme"
            : item.type === "PAYOUT"
              ? "Gain de course"
              : "Rechargement"}
        </Text>
        <Text style={styles.transactionDate}>
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.amount, item.amount < 0 && styles.amountNegative]}>
        {item.amount > 0 ? "+" : ""}
        {formatPrice(item.amount)}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.getWallet(),
  });
  if (wallet.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement du portefeuille"
          description="Calcul des gains et commissions."
        />
      </State>
    );
  if (wallet.isError)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Portefeuille indisponible"
          description={messageErreur(wallet.error)}
        />
      </State>
    );
  const data = [...wallet.data.transactions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <EntetePage
              title="Portefeuille"
              description="Vos gains nets et les commissions prélevées."
            />
            <View style={styles.balance}>
              <View style={styles.balanceIcon}>
                <IconWallet color={couleurs.texte} size={24} />
              </View>
              <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
              <Text style={styles.balanceValue}>
                {formatPrice(wallet.data.balance)}
              </Text>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Gains</Text>
                  <Text style={styles.statValue}>
                    {formatPrice(wallet.data.earnings)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Commissions</Text>
                  <Text style={styles.statValue}>
                    {formatPrice(wallet.data.commissions)}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.sectionLabel}>MOUVEMENTS</Text>
          </View>
        }
        ListEmptyComponent={
          <EtatContenu
            type="vide"
            title="Aucun mouvement"
            description="Les gains de vos courses apparaîtront ici."
          />
        }
        contentContainerStyle={[styles.list, !data.length && styles.grow]}
        refreshControl={
          <RefreshControl
            refreshing={wallet.isRefetching}
            onRefresh={() => void wallet.refetch()}
            colors={[couleurs.primaire]}
          />
        }
      />
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage title="Portefeuille" description="Gains et commissions." />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  list: { padding: espacements.lg, paddingBottom: espacements.xxl },
  grow: { flexGrow: 1 },
  state: { flex: 1, padding: espacements.lg },
  header: { gap: espacements.lg, marginBottom: espacements.sm },
  balance: {
    backgroundColor: couleurs.encre,
    borderRadius: rayons.xl,
    padding: espacements.lg,
    gap: espacements.sm,
  },
  balanceIcon: {
    width: 46,
    height: 46,
    borderRadius: rayons.md,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacements.sm,
  },
  balanceLabel: {
    color: "#AEB4AC",
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  balanceValue: { color: couleurs.surface, fontSize: 32, fontWeight: "900" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: espacements.md,
  },
  stat: { flex: 1, gap: 2 },
  statLabel: { color: "#AEB4AC", fontSize: taillesTexte.petit },
  statValue: {
    color: couleurs.surface,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#373A35",
    marginHorizontal: espacements.md,
  },
  sectionLabel: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  transaction: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.succesClaire,
    alignItems: "center",
    justifyContent: "center",
  },
  commissionIcon: { backgroundColor: couleurs.attentionClaire },
  transactionCopy: { flex: 1, gap: 2 },
  transactionTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "800",
  },
  transactionDate: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
  },
  amount: {
    color: couleurs.succes,
    fontSize: taillesTexte.petit,
    fontWeight: "900",
  },
  amountNegative: { color: couleurs.attention },
});
