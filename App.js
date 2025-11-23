import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

export default function App() {
  // TODO 1: State management
  const [orderId, setOrderId] = useState('');
  const [orderType, setOrderType] = useState('food');
  const [quantity, setQuantity] = useState('1');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // TODO 2: processOrder with switch cases
  const processOrder = (order, onProgress) => {
    return new Promise((resolve) => {
      let processingTime = 0; // in ms
      let discount = 0;

      // SWITCH CASE 1: processing time by type
      switch (order.type) {
        case 'food':
          processingTime = 2000;
          break;
        case 'electronics':
          processingTime = 5000;
          break;
        case 'clothing':
          processingTime = 3000;
          break;
        default:
          processingTime = 1000;
      }

      // SWITCH CASE 2: discount by priority
      switch (order.priority) {
        case 'high':
          discount = 15;
          break;
        case 'medium':
          discount = 10;
          break;
        case 'low':
          discount = 5;
          break;
        default:
          discount = 0;
      }

      const step = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += step;
        const percent = Math.min((elapsed / processingTime) * 100, 100);
        onProgress?.(Math.floor(percent))
        if (percent >= 100) {
            clearInterval(timer);
            
            const actualTime = (processingTime / 1000).toFixed(2);
            resolve({
            status: 'completed',
            order_id: order.order_id,
            type: order.type,
            processing_time: actualTime,
            discount: discount,
            message: `Order ${order.order_id} berhasil diproses`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }    
      }, step);

      const startTime = Date.now();
    });
  };

  // TODO 3: submitSingleOrder
  const submitSingleOrder = async () => {
    if (!orderId.trim()) {
      Alert.alert('Error', 'Order ID tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);

      const order = {
        order_id: orderId.trim(),
        type: orderType,
        quantity: Number(quantity) || 1,
        priority: priority,
      };

      setResults((prev) =>
        [ { ...order, progress: 0, status: 'processing' },
        ...prev,]
      );

      const finished = await processOrder(order, (pct) => {
        setResults((prev) =>
          prev.map((item) => 
            item.order_id === order.order_id ? { ...item, progress: pct } : item
          )
        )
      });

      setResults((prev) =>
          prev.map((item) =>
            item.order_id === finished.order_id ? { ...finished, progress: 100 } 
          : item
          )
        )
      // Reset form
      setOrderId('');
      setOrderType('food');
      setQuantity('1');
      setPriority('medium');

      Alert.alert('Success', `Order ${finished.order_id} selesai (${finished.processing_time}s)`);
    } catch (err) {
      Alert.alert('Error', 'Gagal memproses order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // TODO 4: submitBatchOrders (concurrent)
  const submitBatchOrders = async () => {
    try {
      setLoading(true);

      const timestamp = Date.now();
      const orders = [
        { order_id: `BATCH-F-${timestamp}`, type: 'food', quantity: 1, priority: 'medium' },
        { order_id: `BATCH-E-${timestamp}`, type: 'electronics', quantity: 1, priority: 'high' },
        { order_id: `BATCH-C-${timestamp}`, type: 'clothing', quantity: 1, priority: 'low' },
      ];

      setResults(prev => [
        ...orders.map(o => ({ ...o, progress: 0, status: 'processing' })),
        ...prev,
      ])


      const start = Date.now();

      const promises = orders.map((order) =>
         processOrder(order, pct => {
          setResults(prev => 
            prev.map(item => 
              item.order_id === order.order_id ? { ...item, progress: pct } : item
            )
          )
      }));

      const finishedOrder = await Promise.all(promises);

      setResults(prev =>
        prev.map(item => {
          const match = finishedOrder.find(f => f.order_id === item.order_id)
          return match ? { ...match, progress: 100 } : item
        })
      );

      const end = Date.now();
      const totalSeconds = ((end - start) / 1000).toFixed(2);

      Alert.alert('Batch Completed', `Total waktu: ~${totalSeconds}s (concurrent)`);
    } catch (err) {
      Alert.alert('Error', 'Gagal memproses batch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // TODO 5: testSequentialVsConcurrent
  const testSequentialVsConcurrent = async () => {
    try {
      setLoading(true);

      const timestamp = Date.now();
      const testOrders = [
        { order_id: `T-F-${timestamp}`, type: 'food', quantity: 1, priority: 'medium' },
        { order_id: `T-E-${timestamp}`, type: 'electronics', quantity: 1, priority: 'high' },
        { order_id: `T-C-${timestamp}`, type: 'clothing', quantity: 1, priority: 'low' },
      ];

      setResults(prev => [
        ...testOrders.map(o => ({ ...o, progress: 0, status: 'processing' })),
        ...prev,
      ])

      const startSeq = Date.now();
      const seqResults = [];
      for (const o of testOrders) {

        const r = await processOrder(o, pct => {
          setResults(prev => 
            prev.map(item =>
              item.order_id === o.order_id ? { ...item, progress: pct } : item
            )
          )
        });
        seqResults.push(r);
      }
      const endSeq = Date.now();
      const seqSeconds = ((endSeq - startSeq) / 1000).toFixed(2);

      const startCon = Date.now();
      const conResults = await Promise.all(
        testOrders.map((o) => processOrder(o, pct => 
          setResults(prev =>
            prev.map(item =>
              item.order_id === o.order_id ? { ...item, progress: pct } : item
            )
          )
        )

      ));
      const endCon = Date.now();
      const conSeconds = ((endCon - startCon) / 1000).toFixed(2);

      const allResults = [...seqResults, ...conResults].map(r => ({
        ...r,
        progress: 100,
      }));

      setResults(prev =>
        prev.map(item => {
            const match = [...seqResults, ...conResults].find(
            r => r.order_id === item.order_id
          );
          return match ? { ...match, progress: 100 } : item;
        })
      );

      Alert.alert(
        'Comparison',
        `Sequential: ${seqSeconds}s\nConcurrent: ${conSeconds}s`
      );
    } catch (err) {
      Alert.alert('Error', 'Gagal melakukan comparison');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const TypeButton = ({ type, label }) => (
    <TouchableOpacity
      style={[styles.typeButton, orderType === type && styles.typeButtonActive]}
      onPress={() => setOrderType(type)}
    >
      <Text style={[styles.typeButtonText, orderType === type && styles.typeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PriorityButton = ({ prio, label }) => (
    <TouchableOpacity
      style={[styles.priorityButton, priority === prio && styles.priorityButtonActive]}
      onPress={() => setPriority(prio)}
    >
      <Text style={[styles.priorityButtonText, priority === prio && styles.priorityButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ResultCard = ({ result }) => {
    let typeBadgeColor = '#3b82f6';
    switch (result.type) {
      case 'food':
        typeBadgeColor = '#f59e0b';
        break;
      case 'electronics':
        typeBadgeColor = '#8b5cf6';
        break;
      case 'clothing':
        typeBadgeColor = '#ec4899';
        break;
      default:
        typeBadgeColor = '#3b82f6';
    }

    return (
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultOrderId}>{result.order_id}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
            <Text style={styles.typeBadgeText}>{result.type}</Text>
          </View>
        </View>
        <View style={styles.resultDetails}>
          <Text style={styles.resultText}>⏱ Time: {result.processing_time}s</Text>
          <Text style={styles.resultText}>🏷 Discount: {result.discount}%</Text>
          <Text style={styles.resultText}>🕒 {result.timestamp}</Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
        </View>

        {result.status !== undefined && (
        <View style={styles.progreessContainer}>
          <View style={[styles.progressFill, { width: `${result.progress || 0}%` }]} />
        </View>
        )}
      </View>
    );
  };

  const clearAll = () => {
    setResults([]);
    Alert.alert('Cleared', 'Semua hasil dihapus');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Order Processing</Text>
        <Text style={styles.headerSubtitle}>Concurrent Processing with Switch Case Logic</Text>
      </View>

      {/* Single Order Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Single Order</Text>

        <Text style={styles.label}>Order ID</Text>
        <TextInput
          value={orderId}
          onChangeText={setOrderId}
          placeholder="e.g. ORD-123"
          style={styles.input}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.row}>
          <TypeButton type="food" label="Food" />
          <TypeButton type="electronics" label="Electronics" />
          <TypeButton type="clothing" label="Clothing" />
        </View>

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.row}>
          <PriorityButton prio="high" label="High" />
          <PriorityButton prio="medium" label="Menengah" />
          <PriorityButton prio="low" label="Low" />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={submitSingleOrder} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>Submit Order</Text>}
        </TouchableOpacity>
      </View>

      {/* Concurrent / Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Concurrent Processing</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={submitBatchOrders} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>Process 3 Orders Concurrently</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={testSequentialVsConcurrent} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>Sequential vs Concurrent</Text>}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧾 Results ({results.length})</Text>

        {results.length === 0 && <Text style={styles.empty}>No results yet</Text>}

        {results.map((r) => (
          <ResultCard key={`${r.order_id}-${r.timestamp}`} result={r} />
        ))}
      </View>

      {/* Footer / Clear */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearButton} onPress={clearAll} disabled={loading}>
          <Text style={styles.clearButtonText}>Clear All Results</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Styles (TODO 10)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 14,
    marginTop: 12,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#00000011',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#444',
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    marginTop: 6,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  priorityButton: {
    flex: 1,
    padding: 10,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#10b981',
  },
  priorityButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  footer: {
    marginTop: 16,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Result card
  progreessContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginTop: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultOrderId: {
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#fff',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  resultDetails: {
    marginTop: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#374151',
  },
  resultMessage: {
    marginTop: 6,
    color: '#111827',
    fontWeight: '600',
  },
  empty: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
