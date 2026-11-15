import { useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import rentalData from '@/data-rentals.json';

type Listing = {
  id: string;
  rent: string;
  bedrooms: string;
  bathrooms: string;
  city: string;
  state: string;
  address: string;
  zipcode: string;
  description: string;
  url: string;
  sqft: string;
  homeType: string;
  petFriendly: boolean;
};

type Preferences = { budget: number; beds: number; baths: number; area: string; sqft: number; homeType: string; petsOnly: boolean };
type ScoredListing = Listing & { score: number; fit: number; cityScore: number };
const listings = rentalData as Listing[];
const colors = { ink: '#303128', muted: '#77776d', coral: '#d87358', paper: '#f8f7f2', card: '#fffefa', line: '#e8e5dc', green: '#51594a' };
const numberFrom = (value: string, fallback: number) => Number.isFinite(Number(value)) && value.trim() ? Number(value) : fallback;

function scoreListings(data: Listing[], preferences: Preferences): ScoredListing[] {
  return data.map((item) => {
    const rent = numberFrom(item.rent, 0);
    const bedroomCount = numberFrom(item.bedrooms, 0);
    const bathroomCount = numberFrom(item.bathrooms, 0);
    const budgetScore = Math.exp(-Math.max(rent - preferences.budget, 0) / Math.max(preferences.budget, 1));
    const bedroomScore = Math.max(0, Math.min(1, 1 - Math.max(preferences.beds - bedroomCount, 0) / Math.max(preferences.beds, 1)));
    const bathroomScore = Math.max(0, Math.min(1, 1 - Math.max(preferences.baths - bathroomCount, 0) / Math.max(preferences.baths, 1)));
    const location = `${item.city}, ${item.state} ${item.zipcode}`.toLowerCase();
    const cityScore = !preferences.area.trim() ? 0.5 : location.includes(preferences.area.trim().toLowerCase()) ? 1 : 0.35;
    const squareFeet = numberFrom(item.sqft, 0);
    const sizeScore = !preferences.sqft ? 0.5 : squareFeet ? Math.min(1, squareFeet / preferences.sqft) : 0.35;
    const typeScore = preferences.homeType === 'Any' ? 0.5 : item.homeType === preferences.homeType ? 1 : 0;
    const petScore = preferences.petsOnly ? (item.petFriendly ? 1 : 0) : 0.5;
    const score = 0.5 * cityScore + 0.14 * budgetScore + 0.1 * bedroomScore + 0.05 * bathroomScore + 0.08 * sizeScore + 0.04 * typeScore + 0.04 * petScore + 0.05 * 0.5;
    return { ...item, score, fit: Math.round(score * 100), cityScore };
  }).filter((item) => !preferences.petsOnly || item.petFriendly).sort((a, b) => b.score - a.score);
}

export default function RentalsScreen() {
  const [budgetText, setBudgetText] = useState('3000');
  const [bedsText, setBedsText] = useState('2');
  const [bathsText, setBathsText] = useState('1');
  const [area, setArea] = useState('');
  const [sqftText, setSqftText] = useState('');
  const [homeType, setHomeType] = useState('Any');
  const [petsOnly, setPetsOnly] = useState(false);
  const [applied, setApplied] = useState<Preferences>({ budget: 3000, beds: 2, baths: 1, area: '', sqft: 0, homeType: 'Any', petsOnly: false });
  const ranked = useMemo(() => scoreListings(listings, applied), [applied]);
  const apply = () => {
    Keyboard.dismiss();
    setApplied({ budget: Math.max(1, numberFrom(budgetText, 3000)), beds: Math.max(0, numberFrom(bedsText, 0)), baths: Math.max(0, numberFrom(bathsText, 0)), area, sqft: Math.max(0, numberFrom(sqftText, 0)), homeType, petsOnly });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>A SMARTER WAY TO SEARCH</Text>
      <Text style={styles.title}>Rental matches</Text>
      <Text style={styles.subtitle}>Ranked from the supplied Zillow sample using the preferences that matter to you.</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Your preferences</Text>
        <Text style={styles.label}>PREFERRED CITY, STATE, OR ZIP</Text>
        <TextInput value={area} onChangeText={setArea} placeholder="Try Oakland or 94603" placeholderTextColor="#aaa79c" style={styles.input} returnKeyType="done" />
        <View style={styles.fields}>
          <View style={styles.field}><Text style={styles.label}>MAX RENT / MONTH</Text><TextInput value={budgetText} onChangeText={setBudgetText} keyboardType="numeric" style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.label}>MIN BEDS</Text><TextInput value={bedsText} onChangeText={setBedsText} keyboardType="numeric" style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.label}>MIN BATHS</Text><TextInput value={bathsText} onChangeText={setBathsText} keyboardType="decimal-pad" style={styles.input} /></View>
        </View>
        <Text style={[styles.label, styles.extraLabel]}>MINIMUM SPACE (SQ FT)</Text>
        <TextInput value={sqftText} onChangeText={setSqftText} keyboardType="numeric" placeholder="No minimum" placeholderTextColor="#aaa79c" style={styles.input} />
        <Text style={[styles.label, styles.extraLabel]}>PROPERTY TYPE</Text>
        <View style={styles.options}>{['Any', 'APARTMENT', 'SINGLE_FAMILY'].map((type) => <Pressable key={type} onPress={() => setHomeType(type)} style={[styles.option, homeType === type && styles.optionSelected]}><Text style={[styles.optionText, homeType === type && styles.optionTextSelected]}>{type === 'SINGLE_FAMILY' ? 'House' : type === 'APARTMENT' ? 'Apartment' : type}</Text></Pressable>)}</View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: petsOnly }} onPress={() => setPetsOnly((value) => !value)} style={styles.petOption}><View style={[styles.checkbox, petsOnly && styles.checkboxSelected]}>{petsOnly && <Text style={styles.checkmark}>✓</Text>}</View><Text style={styles.petText}>Only show listings that mention pet-friendly</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={apply} style={styles.button}><Text style={styles.buttonText}>Find my matches</Text></Pressable>
      </View>

      <View style={styles.resultsHeader}><Text style={styles.resultsTitle}>Best fits</Text><Text style={styles.resultsCount}>{ranked.length} sample rentals</Text></View>
      <Text style={styles.disclaimer}>Match scores are weighted fit scores, not probabilities. Location carries 50% of the score and matches city/state/ZIP text. Pet filtering only includes listings that explicitly mention pet-friendly terms.</Text>
      {ranked.map((item) => (
        <View key={item.id} style={styles.listing}>
          <View style={styles.listingTop}><View style={styles.flex}><Text style={styles.address}>{item.address || item.city}</Text><Text style={styles.location}>{item.city}, {item.state} {item.zipcode}</Text></View><View style={styles.fitBadge}><Text style={styles.fitText}>{item.fit}% fit</Text></View></View>
          <Text style={styles.rent}>${numberFrom(item.rent, 0).toLocaleString()}<Text style={styles.perMonth}> / month</Text></Text>
          <Text style={styles.details}>{item.bedrooms} beds  ·  {item.bathrooms} baths{item.sqft ? `  ·  ${Number(item.sqft).toLocaleString()} sq ft` : ''}  ·  {item.homeType === 'SINGLE_FAMILY' ? 'House' : 'Apartment'}</Text>
          <Text style={styles.petStatus}>{item.petFriendly ? 'Pet-friendly terms mentioned' : 'Pet policy not listed'}</Text>
          {!!item.description && <Text numberOfLines={3} style={styles.description}>{item.description}</Text>}
          <Text style={styles.scoreDetails}>Budget · {Math.round(Math.exp(-Math.max(numberFrom(item.rent, 0) - applied.budget, 0) / Math.max(applied.budget, 1)) * 100)}%  ·  Area · {Math.round(item.cityScore * 100)}%</Text>
        </View>
      ))}
      <Text style={styles.footer}>Sample listing data may be stale. Confirm availability and terms with the listing provider.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 48 },
  eyebrow: { color: '#bb725c', fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 32, lineHeight: 40, fontFamily: 'Georgia' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, marginBottom: 22 },
  panel: { padding: 18, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  panelTitle: { color: colors.ink, fontSize: 18, fontFamily: 'Georgia', marginBottom: 16 },
  label: { color: '#88867c', fontSize: 9, letterSpacing: 1, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingHorizontal: 12, color: colors.ink, backgroundColor: '#fff', fontSize: 14 },
  fields: { flexDirection: 'row', gap: 10, marginTop: 14 },
  field: { flex: 1, minWidth: 0 },
  extraLabel: { marginTop: 14 },
  options: { flexDirection: 'row', gap: 8 },
  option: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#f2f0e9' },
  optionSelected: { backgroundColor: '#e9d3c1' },
  optionText: { color: colors.muted, fontSize: 12 },
  optionTextSelected: { color: colors.ink, fontWeight: '700' },
  petOption: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#c8c3b7', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.coral, backgroundColor: colors.coral },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  petText: { color: colors.ink, fontSize: 12, flexShrink: 1 },
  button: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: colors.coral, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 13 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 7 },
  resultsTitle: { color: colors.ink, fontSize: 22, fontFamily: 'Georgia' },
  resultsCount: { color: colors.muted, fontSize: 12 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  listing: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16, marginBottom: 11 },
  listingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  address: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  location: { color: colors.muted, fontSize: 12, marginTop: 4 },
  fitBadge: { backgroundColor: '#e9ede5', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6 },
  fitText: { color: colors.green, fontSize: 11, fontWeight: '700' },
  rent: { color: colors.green, fontSize: 19, fontWeight: '700', marginTop: 13 },
  perMonth: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  details: { color: '#65645b', fontSize: 12, marginTop: 5 },
  petStatus: { color: '#727565', fontSize: 11, marginTop: 5 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  scoreDetails: { color: '#9a988e', fontSize: 10, marginTop: 11 },
  footer: { color: '#9a988e', fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 7 },
});
