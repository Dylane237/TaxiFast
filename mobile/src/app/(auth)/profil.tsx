import { IconId } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { api, type UpdateProfileInput, type UserProfile } from "@/api";
import { AuthPage, Bouton, Champ, MessageEtat } from "@/components";
import { placesValides } from "@/features/auth/auth-validation";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements } from "@/theme";

function FormulaireProfil({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [nom, setNom] = useState(profile.name ?? "");
  const [plaque, setPlaque] = useState(profile.vehicle?.plate ?? "");
  const [modele, setModele] = useState(profile.vehicle?.model ?? "");
  const [places, setPlaces] = useState(profile.vehicle?.seats ? String(profile.vehicle.seats) : "");
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);
  const chauffeur = profile.role === "DRIVER";
  const mutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(input),
    onSuccess: async (updatedProfile) => {
      await updateUser(updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      router.replace("/accueil");
    },
  });

  const enregistrer = () => {
    if (nom.trim().length < 2) {
      setErreurSaisie("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (chauffeur && (!plaque.trim() || !placesValides(places))) {
      setErreurSaisie("Indiquez une plaque et un nombre de places entre 1 et 8.");
      return;
    }
    setErreurSaisie(null);
    mutation.mutate({
      name: nom.trim(),
      ...(chauffeur && {
        plate: plaque.trim(),
        model: modele.trim() || undefined,
        seats: Number(places),
      }),
    });
  };

  return (
    <AuthPage
      icon={<IconId color={couleurs.primaire} size={25} />}
      title="Faisons connaissance."
      description={chauffeur ? "Ajoutez vos informations et celles de votre véhicule." : "Indiquez le nom affiché aux chauffeurs."}
    >
      <View style={styles.formulaire}>
        <Text style={styles.section}>VOS INFORMATIONS</Text>
        <Champ etiquette="Nom affiché" value={nom} onChangeText={setNom} placeholder="Votre nom" aide="Le nom que verront les autres utilisateurs." autoCapitalize="words" />
        {chauffeur ? (
          <>
            <Text style={styles.section}>VOTRE VÉHICULE</Text>
            <Champ etiquette="Plaque d’immatriculation" value={plaque} onChangeText={setPlaque} placeholder="LT 123 AB" autoCapitalize="characters" />
            <Champ etiquette="Modèle du véhicule" value={modele} onChangeText={setModele} placeholder="Toyota Yaris" />
            <Champ etiquette="Nombre de places disponibles" value={places} onChangeText={setPlaces} placeholder="4" aide="La capacité reste vérifiée séparément sur chaque tronçon." keyboardType="number-pad" />
          </>
        ) : null}
        {erreurSaisie ? <MessageEtat type="erreur">{erreurSaisie}</MessageEtat> : null}
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Profil enregistré.</MessageEtat> : null}
        <Bouton chargement={mutation.isPending} onPress={enregistrer}>Enregistrer le profil</Bouton>
      </View>
    </AuthPage>
  );
}

export default function Profil() {
  const profileQuery = useQuery({ queryKey: ["current-user"], queryFn: () => api.getCurrentUser() });

  if (profileQuery.isPending) {
    return (
      <AuthPage icon={<IconId color={couleurs.primaire} size={25} />} title="Votre profil" description="Chargement de vos informations…">
        <ActivityIndicator color={couleurs.texte} size="large" />
      </AuthPage>
    );
  }
  if (profileQuery.isError) {
    return (
      <AuthPage icon={<IconId color={couleurs.primaire} size={25} />} title="Votre profil" description="Impossible de charger vos informations.">
        <MessageEtat type="erreur">{messageErreur(profileQuery.error)}</MessageEtat>
        <Bouton onPress={() => profileQuery.refetch()}>Réessayer</Bouton>
      </AuthPage>
    );
  }
  if (!profileQuery.data) {
    return (
      <AuthPage icon={<IconId color={couleurs.primaire} size={25} />} title="Votre profil" description="Aucune session active.">
        <MessageEtat>Reconnectez-vous pour compléter votre profil.</MessageEtat>
        <Bouton onPress={() => router.replace("/connexion")}>Se connecter</Bouton>
      </AuthPage>
    );
  }
  return <FormulaireProfil profile={profileQuery.data} />;
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  section: { color: couleurs.texteSecondaire, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginTop: espacements.xs },
});
