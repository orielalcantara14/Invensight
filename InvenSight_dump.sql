--
-- PostgreSQL database dump
--

\restrict 1tBSBPYPbAntjqC4JwkWC59gmCIcDTaZgwg7yShwQqkT8fNOORkRLrIRuDS5JIX

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_model_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_model_cache (
    model_key character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    model_engine character varying(30) DEFAULT 'unknown'::character varying NOT NULL,
    status character varying(30) DEFAULT 'not_trained'::character varying NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    last_trained_at timestamp without time zone,
    last_requested_at timestamp without time zone,
    training_duration_ms integer,
    next_scheduled_run timestamp without time zone
);


ALTER TABLE public.analytics_model_cache OWNER TO postgres;

--
-- Name: analytics_model_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_model_runs (
    run_id integer NOT NULL,
    model_key character varying(100) NOT NULL,
    model_engine character varying(30) DEFAULT 'unknown'::character varying NOT NULL,
    status character varying(30) DEFAULT 'unknown'::character varying NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp without time zone,
    duration_ms integer
);


ALTER TABLE public.analytics_model_runs OWNER TO postgres;

--
-- Name: analytics_model_runs_run_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analytics_model_runs_run_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytics_model_runs_run_id_seq OWNER TO postgres;

--
-- Name: analytics_model_runs_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analytics_model_runs_run_id_seq OWNED BY public.analytics_model_runs.run_id;


--
-- Name: auditlog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditlog (
    log_id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    "timestamp" timestamp without time zone NOT NULL,
    details text
);


ALTER TABLE public.auditlog OWNER TO postgres;

--
-- Name: auditlog_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auditlog ALTER COLUMN log_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditlog_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    category_name character varying(100) NOT NULL,
    is_active boolean
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: customer_return_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_return_items (
    item_id integer NOT NULL,
    return_id integer,
    product_id integer,
    quantity integer NOT NULL,
    is_defective boolean DEFAULT false,
    is_damaged boolean DEFAULT false
);


ALTER TABLE public.customer_return_items OWNER TO postgres;

--
-- Name: customer_return_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_return_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_return_items_item_id_seq OWNER TO postgres;

--
-- Name: customer_return_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_return_items_item_id_seq OWNED BY public.customer_return_items.item_id;


--
-- Name: customer_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_returns (
    return_id integer NOT NULL,
    rma_number character varying(100) NOT NULL,
    invoice_id integer,
    customer_info text,
    contact_number character varying(100),
    action_type character varying(50),
    return_status character varying(50) DEFAULT 'Pending'::character varying,
    return_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    sale_id integer,
    customer_name character varying(255),
    return_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_returns OWNER TO postgres;

--
-- Name: customer_returns_return_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_returns_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_returns_return_id_seq OWNER TO postgres;

--
-- Name: customer_returns_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_returns_return_id_seq OWNED BY public.customer_returns.return_id;


--
-- Name: generated_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generated_reports (
    report_id integer NOT NULL,
    report_type character varying(100) NOT NULL,
    start_date date,
    end_date date,
    generated_by character varying(255) NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.generated_reports OWNER TO postgres;

--
-- Name: generated_reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.generated_reports_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.generated_reports_report_id_seq OWNER TO postgres;

--
-- Name: generated_reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.generated_reports_report_id_seq OWNED BY public.generated_reports.report_id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    inventory_id integer NOT NULL,
    product_id integer,
    reorder_level integer NOT NULL,
    last_updated date NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    expected integer DEFAULT 0 NOT NULL,
    actual integer DEFAULT 0 NOT NULL,
    reason_adjustment text DEFAULT ''::text NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: inventory_stock_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_stock_events (
    event_id integer NOT NULL,
    inventory_id integer,
    product_id integer,
    event_type character varying(50) NOT NULL,
    quantity_before integer NOT NULL,
    quantity_after integer NOT NULL,
    expected_before integer NOT NULL,
    expected_after integer NOT NULL,
    actual_before integer NOT NULL,
    actual_after integer NOT NULL,
    quantity_delta integer NOT NULL,
    expected_delta integer NOT NULL,
    actual_delta integer NOT NULL,
    difference_before integer NOT NULL,
    difference_after integer NOT NULL,
    reference_type character varying(50) DEFAULT ''::character varying NOT NULL,
    reference_id character varying(50) DEFAULT ''::character varying NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_stock_events OWNER TO postgres;

--
-- Name: inventory_stock_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_stock_events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_events_event_id_seq OWNER TO postgres;

--
-- Name: inventory_stock_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_stock_events_event_id_seq OWNED BY public.inventory_stock_events.event_id;


--
-- Name: lowstockalerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lowstockalerts (
    alert_id integer NOT NULL,
    product_id integer,
    inventory_id integer,
    threshold integer,
    quantity integer,
    status character varying(50) DEFAULT 'Open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.lowstockalerts OWNER TO postgres;

--
-- Name: lowstockalerts_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lowstockalerts_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lowstockalerts_alert_id_seq OWNER TO postgres;

--
-- Name: lowstockalerts_alert_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lowstockalerts_alert_id_seq OWNED BY public.lowstockalerts.alert_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    notification_id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    title character varying(150) NOT NULL,
    message text NOT NULL,
    link character varying(255),
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_notification_id_seq OWNER TO postgres;

--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_payment_id_seq OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id integer DEFAULT nextval('public.payments_payment_id_seq'::regclass) NOT NULL,
    invoice_id integer,
    payment_method character varying(50) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    transaction_timestamp timestamp without time zone NOT NULL,
    paymongo_source_id character varying(255)
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: pos_terminals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pos_terminals (
    terminal_id integer NOT NULL,
    terminal_name character varying(50) NOT NULL,
    location character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    pos_id integer NOT NULL
);


ALTER TABLE public.pos_terminals OWNER TO postgres;

--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_price_history (
    history_id integer NOT NULL,
    product_id integer,
    old_price numeric(10,2),
    new_price numeric(10,2),
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    changed_by integer
);


ALTER TABLE public.product_price_history OWNER TO postgres;

--
-- Name: product_price_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_price_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_price_history_history_id_seq OWNER TO postgres;

--
-- Name: product_price_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_price_history_history_id_seq OWNED BY public.product_price_history.history_id;


--
-- Name: product_return_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_return_items (
    item_id integer NOT NULL,
    return_id integer,
    product_id integer,
    quantity integer NOT NULL
);


ALTER TABLE public.product_return_items OWNER TO postgres;

--
-- Name: product_return_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_return_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_return_items_item_id_seq OWNER TO postgres;

--
-- Name: product_return_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_return_items_item_id_seq OWNED BY public.product_return_items.item_id;


--
-- Name: product_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_returns (
    return_id integer NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    notes text,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    supplier_id integer
);


ALTER TABLE public.product_returns OWNER TO postgres;

--
-- Name: product_returns_return_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_returns_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_returns_return_id_seq OWNER TO postgres;

--
-- Name: product_returns_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_returns_return_id_seq OWNED BY public.product_returns.return_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    product_id integer NOT NULL,
    category_id integer,
    supplier_id integer,
    product_name character varying(100) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    sku character varying(100) NOT NULL,
    date_added date,
    unit_of_measurement character varying(50),
    specific_category character varying(150),
    pos_price numeric(10,2),
    status character varying(50) DEFAULT 'Active'::character varying,
    image_url text
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    item_id integer NOT NULL,
    order_id character varying(50),
    product_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2)
);


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_order_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_items_item_id_seq OWNER TO postgres;

--
-- Name: purchase_order_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_items_item_id_seq OWNED BY public.purchase_order_items.item_id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    order_id character varying(50) NOT NULL,
    supplier_id integer,
    user_id integer,
    status character varying(50) DEFAULT 'Pending'::character varying,
    expected_delivery date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    received_at timestamp without time zone,
    total_items integer DEFAULT 0,
    notes text
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    report_id integer NOT NULL,
    report_type character varying(100),
    generated_by integer,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payload jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_report_id_seq OWNER TO postgres;

--
-- Name: reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_report_id_seq OWNED BY public.reports.report_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    user_id integer,
    permissions_text text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sales_invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_invoice_id_seq OWNER TO postgres;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    invoice_id integer DEFAULT nextval('public.sales_invoice_id_seq'::regclass) NOT NULL,
    pos_terminal_id integer,
    user_id integer,
    invoice_date date NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    customer_info character varying(200) NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_status character varying(50) NOT NULL,
    service_charge numeric(10,2) NOT NULL,
    transaction_timestamp timestamp without time zone NOT NULL,
    return_id integer,
    cash_received numeric(10,2) NOT NULL,
    cash_given numeric(10,2) NOT NULL,
    change_amount numeric(10,2),
    contact_number character varying(50),
    address character varying(255),
    failure_reason text,
    customer_name character varying(255)
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sold_items_sold_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sold_items_sold_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sold_items_sold_item_id_seq OWNER TO postgres;

--
-- Name: sold_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sold_items (
    sold_item_id integer DEFAULT nextval('public.sold_items_sold_item_id_seq'::regclass) NOT NULL,
    invoice_id integer,
    product_id integer,
    return_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL
);


ALTER TABLE public.sold_items OWNER TO postgres;

--
-- Name: supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier (
    supplier_id integer NOT NULL,
    supplier_name character varying(150) NOT NULL,
    address character varying(150),
    email character varying(70),
    contact_number character varying(20),
    product_supplied text,
    total_orders integer NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    completed_orders integer DEFAULT 0
);


ALTER TABLE public.supplier OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    setting_key character varying(100) NOT NULL,
    setting_value text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    user_id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    employee_id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    created_date date NOT NULL,
    last_login date,
    username character varying(100),
    permissions_json jsonb DEFAULT '{}'::jsonb,
    email character varying(255),
    address text,
    password_changed_at date
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: analytics_model_runs run_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_model_runs ALTER COLUMN run_id SET DEFAULT nextval('public.analytics_model_runs_run_id_seq'::regclass);


--
-- Name: customer_return_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_return_items ALTER COLUMN item_id SET DEFAULT nextval('public.customer_return_items_item_id_seq'::regclass);


--
-- Name: customer_returns return_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_returns ALTER COLUMN return_id SET DEFAULT nextval('public.customer_returns_return_id_seq'::regclass);


--
-- Name: generated_reports report_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generated_reports ALTER COLUMN report_id SET DEFAULT nextval('public.generated_reports_report_id_seq'::regclass);


--
-- Name: inventory_stock_events event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock_events ALTER COLUMN event_id SET DEFAULT nextval('public.inventory_stock_events_event_id_seq'::regclass);


--
-- Name: lowstockalerts alert_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lowstockalerts ALTER COLUMN alert_id SET DEFAULT nextval('public.lowstockalerts_alert_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.notifications_notification_id_seq'::regclass);


--
-- Name: product_price_history history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_price_history ALTER COLUMN history_id SET DEFAULT nextval('public.product_price_history_history_id_seq'::regclass);


--
-- Name: product_return_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_return_items ALTER COLUMN item_id SET DEFAULT nextval('public.product_return_items_item_id_seq'::regclass);


--
-- Name: product_returns return_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_returns ALTER COLUMN return_id SET DEFAULT nextval('public.product_returns_return_id_seq'::regclass);


--
-- Name: purchase_order_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN item_id SET DEFAULT nextval('public.purchase_order_items_item_id_seq'::regclass);


--
-- Name: reports report_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN report_id SET DEFAULT nextval('public.reports_report_id_seq'::regclass);


--
-- Data for Name: analytics_model_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics_model_cache (model_key, payload, model_engine, status, message, last_trained_at, last_requested_at, training_duration_ms, next_scheduled_run) FROM stdin;
overview	{"generated_at": "2026-04-07T20:06:27.012585+00:00", "forecast_accuracy": 19.23210490256659, "sales_forecast_engine": "prophet", "stock_forecast_engine": "rolling_average"}	prophet	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020	2026-04-08 05:06:27.012595
forecast_30d	{"response": {"series": [{"date": "2026-01-09", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5168.407705125038, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1656.4538842796699, "trend_component": -1656.4538842796699, "weekly_component": 941.2059393399104, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393399104}, {"date": "2026-01-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3756.3345178281565, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1600.2839228439307, "trend_component": -1600.2839228439307, "weekly_component": -619.3926774348835, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774348835}, {"date": "2026-01-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7053.814906777696, "actual_sales": 0.0, "forecast_sales": 1162.233857341294, "smoothed_sales": -1544.1139614081912, "trend_component": -1544.1139614081912, "weekly_component": 2706.347818749485, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818749485}, {"date": "2026-01-12", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2731.5436771022987, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1487.943999972452, "trend_component": -1487.943999972452, "weekly_component": -1883.4054242381026, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242381026}, {"date": "2026-01-13", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3719.7362464919793, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1431.7740384514866, "trend_component": -1431.7740384514866, "weekly_component": -800.1438969585433, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969585433}, {"date": "2026-01-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5031.170354776005, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1375.604076930521, "trend_component": -1375.604076930521, "weekly_component": 194.64979146597912, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979146597912}, {"date": "2026-01-15", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4028.790480668987, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1319.434115409555, "trend_component": -1319.434115409555, "weekly_component": -539.261550930759, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.261550930759}, {"date": "2026-01-16", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5782.79904055976, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1263.2641538413027, "trend_component": -1263.2641538413027, "weekly_component": 941.2059393479466, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393479466}, {"date": "2026-01-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4344.487077179087, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1207.0941922730506, "trend_component": -1207.0941922730506, "weekly_component": -619.3926774402196, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774402196}, {"date": "2026-01-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7703.655190747426, "actual_sales": 0.0, "forecast_sales": 1555.4235880431206, "smoothed_sales": -1150.924230704798, "trend_component": -1150.924230704798, "weekly_component": 2706.3478187479186, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187479186}, {"date": "2026-01-19", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3212.9804662373936, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1094.7542692062436, "trend_component": -1094.7542692062436, "weekly_component": -1883.4054242453606, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242453606}, {"date": "2026-01-20", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4437.88816004044, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1038.5843077076895, "trend_component": -1038.5843077076895, "weekly_component": -800.1438969499054, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969499054}, {"date": "2026-01-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5120.595502306981, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -982.4143462722642, "trend_component": -982.4143462722642, "weekly_component": 194.6497914694057, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.6497914694057}, {"date": "2026-01-22", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4326.930301312311, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -926.244384836839, "trend_component": -926.244384836839, "weekly_component": -539.2615509206212, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509206212}, {"date": "2026-01-23", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6115.399367833525, "actual_sales": 0.0, "forecast_sales": 71.131515941869, "smoothed_sales": -870.0744234014137, "trend_component": -870.0744234014137, "weekly_component": 941.2059393432827, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393432827}, {"date": "2026-01-24", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4713.079523034242, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -813.9044618446309, "trend_component": -813.9044618446309, "weekly_component": -619.3926774395252, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774395252}, {"date": "2026-01-25", "event_icon": null, "lower_bound": 0.0, "upper_bound": 8139.076989977872, "actual_sales": 0.0, "forecast_sales": 1948.6133184616813, "smoothed_sales": -757.734500287848, "trend_component": -757.734500287848, "weekly_component": 2706.3478187495293, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187495293}, {"date": "2026-01-26", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3770.588623564593, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -701.5645387310652, "trend_component": -701.5645387310652, "weekly_component": -1883.4054242451318, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242451318}, {"date": "2026-01-27", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4355.097808440387, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -645.3945771241313, "trend_component": -645.3945771241313, "weekly_component": -800.1438969618924, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969618924}, {"date": "2026-01-28", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5305.729154463227, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -589.2246155171972, "trend_component": -589.2246155171972, "weekly_component": 194.64979146787152, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979146787152}, {"date": "2026-01-29", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5027.614878399151, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -533.0546539102633, "trend_component": -533.0546539102633, "weekly_component": -539.2615509330972, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509330972}, {"date": "2026-01-30", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6899.227493757166, "actual_sales": 0.0, "forecast_sales": 464.32124714564367, "smoothed_sales": -476.8846921929748, "trend_component": -476.8846921929748, "weekly_component": 941.2059393386185, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393386185}, {"date": "2026-01-31", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4822.868354618095, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -420.7147304756862, "trend_component": -420.7147304756862, "weekly_component": -619.3926774370705, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774370705}, {"date": "2026-02-01", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7773.104197045415, "actual_sales": 0.0, "forecast_sales": 2341.803049989565, "smoothed_sales": -364.5447687583973, "trend_component": -364.5447687583973, "weekly_component": 2706.3478187479623, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187479623}, {"date": "2026-02-02", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4126.844388379386, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -308.3748069294885, "trend_component": -308.3748069294885, "weekly_component": -1883.4054242442626, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242442626}, {"date": "2026-02-03", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4948.278890787548, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -252.20484510057943, "trend_component": -252.20484510057943, "weekly_component": -800.1438969532544, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969532544}, {"date": "2026-02-04", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5911.490296216938, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -196.03488327167094, "trend_component": -196.03488327167094, "weekly_component": 194.64979147129822, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147129822}, {"date": "2026-02-05", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5455.292664051363, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -139.86086791267002, "trend_component": -139.86086791267002, "weekly_component": -539.2615509262095, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509262095}, {"date": "2026-02-06", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7447.516567577881, "actual_sales": 0.0, "forecast_sales": 857.5190867866352, "smoothed_sales": -83.68685255366938, "trend_component": -83.68685255366938, "weekly_component": 941.2059393403046, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393403046}, {"date": "2026-02-07", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5744.829642458114, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -27.512837098263155, "trend_component": -27.512837098263155, "weekly_component": -619.3926774381368, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774381368}, {"date": "2026-02-08", "event_icon": null, "lower_bound": 0.0, "upper_bound": 9057.815570845642, "actual_sales": 0.0, "forecast_sales": 2735.008997105006, "smoothed_sales": 28.661178357143072, "trend_component": 28.661178357143072, "weekly_component": 2706.347818747863, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818747863}, {"date": "2026-02-09", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4177.803935091002, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 84.8351938125493, "trend_component": 84.8351938125493, "weekly_component": -1883.405424236548, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.405424236548}, {"date": "2026-02-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5737.566403522644, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 141.00920940510548, "trend_component": 141.00920940510548, "weekly_component": -800.1438969446166, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969446166}, {"date": "2026-02-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6395.250675521852, "actual_sales": 0.0, "forecast_sales": 391.8330164612911, "smoothed_sales": 197.18322499766197, "trend_component": 197.18322499766197, "weekly_component": 194.6497914636291, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.6497914636291}, {"date": "2026-02-12", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5642.378707047258, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 253.35724059021874, "trend_component": 253.35724059021874, "weekly_component": -539.2615509290035, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509290035}, {"date": "2026-02-13", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7304.088577057862, "actual_sales": 0.0, "forecast_sales": 1250.7811539176769, "smoothed_sales": 309.5752145833608, "trend_component": 309.5752145833608, "weekly_component": 941.2059393343162, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393343162}, {"date": "2026-02-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5772.203830270759, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 365.7931885765028, "trend_component": 365.7931885765028, "weekly_component": -619.3926774356819, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774356819}, {"date": "2026-02-15", "event_icon": null, "lower_bound": 0.0, "upper_bound": 9304.256941281388, "actual_sales": 0.0, "forecast_sales": 3128.358981315941, "smoothed_sales": 422.0111625696449, "trend_component": 422.0111625696449, "weekly_component": 2706.347818746296, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818746296}, {"date": "2026-02-16", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4901.646388764992, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 478.341715526802, "trend_component": 478.341715526802, "weekly_component": -1883.4054242438056, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242438056}, {"date": "2026-02-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5870.937237509738, "actual_sales": 0.0, "forecast_sales": 10.254624380030236, "smoothed_sales": 534.6722684839597, "trend_component": 534.6722684839597, "weekly_component": -800.1438969462915, "yearly_component": 0.0, "holidays_component": 275.72625284236204, "seasonal_component": -800.1438969462915}, {"date": "2026-02-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6929.950703872243, "actual_sales": 0.0, "forecast_sales": 785.6526129192686, "smoothed_sales": 591.002821441117, "trend_component": 591.002821441117, "weekly_component": 194.64979147815154, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147815154}, {"date": "2026-02-19", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5933.6092408524755, "actual_sales": 0.0, "forecast_sales": 108.29811799599577, "smoothed_sales": 647.5596689277933, "trend_component": 647.5596689277933, "weekly_component": -539.2615509317975, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509317975}, {"date": "2026-02-20", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7855.345717394102, "actual_sales": 0.0, "forecast_sales": 1645.322455756821, "smoothed_sales": 704.1165164144692, "trend_component": 704.1165164144692, "weekly_component": 941.2059393423519, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393423519}, {"date": "2026-02-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5743.037958359456, "actual_sales": 0.0, "forecast_sales": 141.2806864679178, "smoothed_sales": 760.6733639011451, "trend_component": 760.6733639011451, "weekly_component": -619.3926774332273, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774332273}, {"date": "2026-02-22", "event_icon": null, "lower_bound": 0.0, "upper_bound": 9905.290840723368, "actual_sales": 0.0, "forecast_sales": 3523.9350515109463, "smoothed_sales": 817.5872327630394, "trend_component": 817.5872327630394, "weekly_component": 2706.347818747907, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818747907}, {"date": "2026-02-23", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5088.138847447211, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 874.5011016249339, "trend_component": 874.5011016249339, "weekly_component": -1883.405424243577, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.405424243577}, {"date": "2026-02-24", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6207.6785804046485, "actual_sales": 0.0, "forecast_sales": 131.3854104331624, "smoothed_sales": 931.5293073745221, "trend_component": 931.5293073745221, "weekly_component": -800.1438969413597, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969413597}, {"date": "2026-02-25", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7310.211264455691, "actual_sales": 0.0, "forecast_sales": 1183.2073045896307, "smoothed_sales": 988.5575131241093, "trend_component": 988.5575131241093, "weekly_component": 194.6497914655213, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.6497914655213}, {"date": "2026-02-26", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6495.899108079718, "actual_sales": 0.0, "forecast_sales": 506.32416793910545, "smoothed_sales": 1045.585718873697, "trend_component": 1045.585718873697, "weekly_component": -539.2615509345916, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509345916}, {"date": "2026-02-27", "event_icon": null, "lower_bound": 0.0, "upper_bound": 8249.900808479088, "actual_sales": 0.0, "forecast_sales": 2043.9689183122205, "smoothed_sales": 1102.7629789745324, "trend_component": 1102.7629789745324, "weekly_component": 941.2059393376879, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393376879}, {"date": "2026-02-28", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6408.384193083651, "actual_sales": 0.0, "forecast_sales": 540.5475616428345, "smoothed_sales": 1159.9402390753673, "trend_component": 1159.9402390753673, "weekly_component": -619.3926774325329, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774325329}, {"date": "2026-03-01", "event_icon": null, "lower_bound": 0.0, "upper_bound": 9933.95969912981, "actual_sales": 0.0, "forecast_sales": 3923.465317927188, "smoothed_sales": 1217.1174991762025, "trend_component": 1217.1174991762025, "weekly_component": 2706.3478187509854, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187509854}, {"date": "2026-03-02", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4976.904503936193, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 1274.6451411522492, "trend_component": 1274.6451411522492, "weekly_component": -1883.4054242433485, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242433485}, {"date": "2026-03-03", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6460.426036438859, "actual_sales": 0.0, "forecast_sales": 532.0288861749492, "smoothed_sales": 1332.172783128296, "trend_component": 1332.172783128296, "weekly_component": -800.1438969533468, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969533468}, {"date": "2026-03-04", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7307.345074399907, "actual_sales": 0.0, "forecast_sales": 1584.3502165843865, "smoothed_sales": 1389.7004251043427, "trend_component": 1389.7004251043427, "weekly_component": 194.64979148004386, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979148004386}, {"date": "2026-03-05", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6956.134173480103, "actual_sales": 0.0, "forecast_sales": 908.3911263293314, "smoothed_sales": 1447.6526772570353, "trend_component": 1447.6526772570353, "weekly_component": -539.2615509277039, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509277039}, {"date": "2026-03-06", "event_icon": null, "lower_bound": 0.0, "upper_bound": 8583.716214073418, "actual_sales": 0.0, "forecast_sales": 2446.810868749103, "smoothed_sales": 1505.604929409729, "trend_component": 1505.604929409729, "weekly_component": 941.2059393393739, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393393739}, {"date": "2026-03-07", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7326.719299183968, "actual_sales": 0.0, "forecast_sales": 944.164504124553, "smoothed_sales": 1563.5571815624223, "trend_component": 1563.5571815624223, "weekly_component": -619.3926774378693, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774378693}, {"date": "2026-03-08", "event_icon": null, "lower_bound": 0.0, "upper_bound": 10392.421548977236, "actual_sales": 0.0, "forecast_sales": 4413.903005223755, "smoothed_sales": 1707.5551864711585, "trend_component": 1707.5551864711585, "weekly_component": 2706.347818752596, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818752596}, {"date": "2026-03-09", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6034.474351502621, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 1851.5531913798925, "trend_component": 1851.5531913798925, "weekly_component": -1883.40542424312, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.40542424312}, {"date": "2026-03-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7552.551409928516, "actual_sales": 0.0, "forecast_sales": 1195.4072993439265, "smoothed_sales": 1995.5511962886353, "trend_component": 1995.5511962886353, "weekly_component": -800.1438969447088, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969447088}, {"date": "2026-03-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 8242.13748077896, "actual_sales": 0.0, "forecast_sales": 2614.930126972903, "smoothed_sales": 2420.2803355005285, "trend_component": 2420.2803355005285, "weekly_component": 194.64979147237457, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147237457}, {"date": "2026-03-12", "event_icon": null, "lower_bound": 0.0, "upper_bound": 7893.65683637815, "actual_sales": 0.0, "forecast_sales": 2305.747923785174, "smoothed_sales": 2845.0094747124217, "trend_component": 2845.0094747124217, "weekly_component": -539.261550927248, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.261550927248}, {"date": "2026-03-13", "event_icon": null, "lower_bound": 0.0, "upper_bound": 10625.298366952047, "actual_sales": 0.0, "forecast_sales": 4211.194596529073, "smoothed_sales": 3269.9886571880133, "trend_component": 3269.9886571880133, "weekly_component": 941.20593934106, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.20593934106}, {"date": "2026-03-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 9146.333044641246, "actual_sales": 0.0, "forecast_sales": 3075.575162224669, "smoothed_sales": 3694.967839663605, "trend_component": 3694.967839663605, "weekly_component": -619.3926774389358, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774389358}, {"date": "2026-03-15", "event_icon": null, "lower_bound": 817.9803783065497, "upper_bound": 12883.684008189592, "actual_sales": 0.0, "forecast_sales": 6826.2948408870525, "smoothed_sales": 4119.947022139201, "trend_component": 4119.947022139201, "weekly_component": 2706.3478187478518, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187478518}, {"date": "2026-03-16", "event_icon": null, "lower_bound": 0.0, "upper_bound": 8527.085072375836, "actual_sales": 0.0, "forecast_sales": 2661.6009857615745, "smoothed_sales": 4545.006410011952, "trend_component": 4545.006410011952, "weekly_component": -1883.4054242503773, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242503773}, {"date": "2026-03-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 10117.748171760712, "actual_sales": 0.0, "forecast_sales": 4169.921900938314, "smoothed_sales": 4970.0657978846975, "trend_component": 4970.0657978846975, "weekly_component": -800.1438969463834, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969463834}, {"date": "2026-03-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 11685.81570256229, "actual_sales": 0.0, "forecast_sales": 5589.774977222158, "smoothed_sales": 5395.1251857574525, "trend_component": 5395.1251857574525, "weekly_component": 194.64979146470532, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979146470532}, {"date": "2026-03-19", "event_icon": null, "lower_bound": 0.0, "upper_bound": 11801.201687645305, "actual_sales": 0.0, "forecast_sales": 5281.341246041586, "smoothed_sales": 5820.602796961946, "trend_component": 5820.602796961946, "weekly_component": -539.2615509203603, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509203603}, {"date": "2026-03-20", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5917.501539990788, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 6246.08040816644, "trend_component": 6246.08040816644, "weekly_component": 941.2059393427461, "yearly_component": 0.0, "holidays_component": -7202.9307326004, "seasonal_component": 941.2059393427462}, {"date": "2026-03-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 12196.218166956975, "actual_sales": 0.0, "forecast_sales": 6052.165341934453, "smoothed_sales": 6671.558019370934, "trend_component": 6671.558019370934, "weekly_component": -619.392677436481, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.392677436481}, {"date": "2026-03-22", "event_icon": null, "lower_bound": 3969.4657198996847, "upper_bound": 15782.794475909195, "actual_sales": 0.0, "forecast_sales": 9803.402789321783, "smoothed_sales": 7097.05497057232, "trend_component": 7097.05497057232, "weekly_component": 2706.347818749463, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818749463}, {"date": "2026-03-23", "event_icon": null, "lower_bound": 0.0, "upper_bound": 11497.280135125504, "actual_sales": 0.0, "forecast_sales": 5639.146497531682, "smoothed_sales": 7522.551921773705, "trend_component": 7522.551921773705, "weekly_component": -1883.4054242420223, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242420223}, {"date": "2026-03-24", "event_icon": null, "lower_bound": 1017.9381972039405, "upper_bound": 13526.985402198095, "actual_sales": 0.0, "forecast_sales": 7147.9049760233265, "smoothed_sales": 7948.0488729750905, "trend_component": 7948.0488729750905, "weekly_component": -800.1438969517641, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969517641}, {"date": "2026-03-25", "event_icon": null, "lower_bound": 2767.677234597295, "upper_bound": 14582.059964431148, "actual_sales": 0.0, "forecast_sales": 8568.195615655703, "smoothed_sales": 8373.545824176475, "trend_component": 8373.545824176475, "weekly_component": 194.64979147922787, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147922787}, {"date": "2026-03-26", "event_icon": null, "lower_bound": 2381.414061489084, "upper_bound": 14363.758589366123, "actual_sales": 11998.66, "forecast_sales": 8259.781224445025, "smoothed_sales": 8799.04277537786, "trend_component": 8799.04277537786, "weekly_component": -539.261550932836, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.261550932836}, {"date": "2026-03-27", "event_icon": null, "lower_bound": 4177.151125337211, "upper_bound": 15977.366936986062, "actual_sales": 22094.18, "forecast_sales": 10165.745665917328, "smoothed_sales": 9224.539726579245, "trend_component": 9224.539726579245, "weekly_component": 941.205939338082, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.205939338082}, {"date": "2026-03-28", "event_icon": null, "lower_bound": 3326.9826581069606, "upper_bound": 15064.810480287802, "actual_sales": 12355.0, "forecast_sales": 9030.644000338812, "smoothed_sales": 9650.03667778063, "trend_component": 9650.03667778063, "weekly_component": -619.3926774418172, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774418172}, {"date": "2026-03-29", "event_icon": null, "lower_bound": 6269.813994893634, "upper_bound": 18337.12429060913, "actual_sales": 28820.88, "forecast_sales": 12781.881447733085, "smoothed_sales": 10075.533628982012, "trend_component": 10075.533628982012, "weekly_component": 2706.3478187510736, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187510736}, {"date": "2026-03-30", "event_icon": null, "lower_bound": 2941.921968103942, "upper_bound": 14499.097023189704, "actual_sales": 6471.89, "forecast_sales": 8617.625155934116, "smoothed_sales": 10501.030580183397, "trend_component": 10501.030580183397, "weekly_component": -1883.4054242492798, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242492798}, {"date": "2026-03-31", "event_icon": null, "lower_bound": 3792.3233581265185, "upper_bound": 16371.182052783208, "actual_sales": 13070.81, "forecast_sales": 10126.383634431348, "smoothed_sales": 10926.527531384787, "trend_component": 10926.527531384787, "weekly_component": -800.1438969534387, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969534387}, {"date": "2026-04-01", "event_icon": null, "lower_bound": 5500.624348885353, "upper_bound": 17850.0553042496, "actual_sales": 27427.86, "forecast_sales": 11546.67427405773, "smoothed_sales": 11352.024482586172, "trend_component": 11352.024482586172, "weekly_component": 194.64979147155867, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147155867}, {"date": "2026-04-02", "event_icon": null, "lower_bound": 0.0, "upper_bound": 11110.872541658404, "actual_sales": 5329.8, "forecast_sales": 5297.537628673905, "smoothed_sales": 11777.521433787553, "trend_component": 11777.521433787553, "weekly_component": -539.2615509259484, "yearly_component": 0.0, "holidays_component": -5940.7222541877, "seasonal_component": -539.2615509259485}, {"date": "2026-04-03", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6442.132577043309, "actual_sales": 143.17, "forecast_sales": 110.79419063768, "smoothed_sales": 12203.018384988938, "trend_component": 12203.018384988938, "weekly_component": 941.2059393384436, "yearly_component": 0.0, "holidays_component": -13033.4301336897, "seasonal_component": 941.2059393384425}, {"date": "2026-04-04", "event_icon": null, "lower_bound": 1118.0670573219818, "upper_bound": 13184.00459492165, "actual_sales": 7231.82, "forecast_sales": 7197.13129712526, "smoothed_sales": 12628.515336190323, "trend_component": 12628.515336190323, "weekly_component": -619.3926774393626, "yearly_component": 0.0, "holidays_component": -4811.9913616257, "seasonal_component": -619.3926774393631}, {"date": "2026-04-05", "event_icon": null, "lower_bound": 10119.548954854532, "upper_bound": 21903.564605461666, "actual_sales": 41114.43, "forecast_sales": 15760.360106138038, "smoothed_sales": 13054.012287391708, "trend_component": 13054.012287391708, "weekly_component": 2706.3478187463293, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187463293}, {"date": "2026-04-06", "event_icon": null, "lower_bound": 5526.526285411502, "upper_bound": 17945.089535849107, "actual_sales": 6094.29, "forecast_sales": 11596.103814351529, "smoothed_sales": 13479.509238593095, "trend_component": 13479.509238593095, "weekly_component": -1883.4054242415652, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242415652}, {"date": "2026-04-07", "event_icon": null, "lower_bound": 6719.567462663111, "upper_bound": 19191.212273686793, "actual_sales": 16154.46, "forecast_sales": 13104.862292839367, "smoothed_sales": 13905.00618979448, "trend_component": 13905.00618979448, "weekly_component": -800.1438969551133, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969551133}, {"date": "2026-04-08", "event_icon": null, "lower_bound": 8501.813858964473, "upper_bound": 20389.576597599, "actual_sales": 17035.37, "forecast_sales": 14525.15293246589, "smoothed_sales": 14330.503140995865, "trend_component": 14330.503140995865, "weekly_component": 194.6497914700243, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.6497914700243}, {"date": "2026-04-09", "event_icon": "ai_predicted", "lower_bound": 8078.84509581463, "upper_bound": 20409.019767536312, "actual_sales": null, "forecast_sales": 14216.738541281153, "smoothed_sales": 14756.00009219725, "trend_component": 14756.00009219725, "weekly_component": -539.2615509190607, "yearly_component": 0.0, "holidays_component": 0.00000000296331205807035, "seasonal_component": -539.2615509190607}, {"date": "2026-04-10", "event_icon": "ai_predicted", "lower_bound": 10801.36805348558, "upper_bound": 22137.20853265885, "actual_sales": null, "forecast_sales": 16122.702982738765, "smoothed_sales": 15181.497043398635, "trend_component": 15181.497043398635, "weekly_component": 941.2059393401297, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393401297}, {"date": "2026-04-11", "event_icon": "ai_predicted", "lower_bound": 9155.474108293254, "upper_bound": 20891.215085320247, "actual_sales": null, "forecast_sales": 14987.60131716135, "smoothed_sales": 15606.99399460002, "trend_component": 15606.99399460002, "weekly_component": -619.3926774386683, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774386683}, {"date": "2026-04-12", "event_icon": "ai_predicted", "lower_bound": 13050.74213982937, "upper_bound": 24830.25279636544, "actual_sales": null, "forecast_sales": 18738.83876454935, "smoothed_sales": 16032.49094580141, "trend_component": 16032.49094580141, "weekly_component": 2706.3478187479404, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187479404}, {"date": "2026-04-13", "event_icon": "ai_predicted", "lower_bound": 8285.918429069023, "upper_bound": 20200.565231261207, "actual_sales": null, "forecast_sales": 14574.582472753962, "smoothed_sales": 16457.987897002786, "trend_component": 16457.987897002786, "weekly_component": -1883.4054242488228, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242488228}, {"date": "2026-04-14", "event_icon": "ai_predicted", "lower_bound": 9659.032232166492, "upper_bound": 22877.322247082226, "actual_sales": null, "forecast_sales": 16083.340951247383, "smoothed_sales": 16883.48484820417, "trend_component": 16883.48484820417, "weekly_component": -800.1438969567877, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969567877}, {"date": "2026-04-15", "event_icon": "ai_predicted", "lower_bound": 11126.10417084721, "upper_bound": 23861.649357986174, "actual_sales": null, "forecast_sales": 17503.63159086791, "smoothed_sales": 17308.981799405556, "trend_component": 17308.981799405556, "weekly_component": 194.64979146235515, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979146235515}, {"date": "2026-04-16", "event_icon": "ai_predicted", "lower_bound": 11057.93910947453, "upper_bound": 22971.41821790492, "actual_sales": null, "forecast_sales": 17195.21719967541, "smoothed_sales": 17734.478750606948, "trend_component": 17734.478750606948, "weekly_component": -539.2615509315365, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509315365}, {"date": "2026-04-17", "event_icon": "ai_predicted", "lower_bound": 12789.677266108334, "upper_bound": 25014.784168051356, "actual_sales": null, "forecast_sales": 19101.181641156498, "smoothed_sales": 18159.975701808333, "trend_component": 18159.975701808333, "weekly_component": 941.2059393481654, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393481654}, {"date": "2026-04-18", "event_icon": "ai_predicted", "lower_bound": 12041.814356137606, "upper_bound": 23776.140635372245, "actual_sales": null, "forecast_sales": 17966.079975571745, "smoothed_sales": 18585.472653009718, "trend_component": 18585.472653009718, "weekly_component": -619.3926774379739, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774379739}, {"date": "2026-04-19", "event_icon": "ai_predicted", "lower_bound": 15565.153177483711, "upper_bound": 27788.083005088265, "actual_sales": null, "forecast_sales": 21717.31742296212, "smoothed_sales": 19010.969604211103, "trend_component": 19010.969604211103, "weekly_component": 2706.347818751018, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818751018}, {"date": "2026-04-20", "event_icon": "ai_predicted", "lower_bound": 11878.699162017372, "upper_bound": 23579.083611228238, "actual_sales": null, "forecast_sales": 17553.061131179507, "smoothed_sales": 19436.466555412488, "trend_component": 19436.466555412488, "weekly_component": -1883.4054242329807, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242329807}, {"date": "2026-04-21", "event_icon": "ai_predicted", "lower_bound": 13047.253205573183, "upper_bound": 25170.70449393412, "actual_sales": null, "forecast_sales": 19061.819609665716, "smoothed_sales": 19861.963506613865, "trend_component": 19861.963506613865, "weekly_component": -800.14389694815, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.14389694815}, {"date": "2026-04-22", "event_icon": "ai_predicted", "lower_bound": 14312.25204883207, "upper_bound": 26136.9434344307, "actual_sales": null, "forecast_sales": 20482.11024928103, "smoothed_sales": 20287.46045781525, "trend_component": 20287.46045781525, "weekly_component": 194.6497914657817, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.6497914657817}, {"date": "2026-04-23", "event_icon": "ai_predicted", "lower_bound": 14035.869265363921, "upper_bound": 26122.696925982025, "actual_sales": null, "forecast_sales": 20173.695858091985, "smoothed_sales": 20712.957409016635, "trend_component": 20712.957409016635, "weekly_component": -539.2615509246488, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.2615509246488}, {"date": "2026-04-24", "event_icon": "ai_predicted", "lower_bound": 16296.433149911529, "upper_bound": 28118.556084124975, "actual_sales": null, "forecast_sales": 22079.660299560197, "smoothed_sales": 21138.45436021802, "trend_component": 21138.45436021802, "weekly_component": 941.2059393421772, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393421772}, {"date": "2026-04-25", "event_icon": "ai_predicted", "lower_bound": 14870.547828293677, "upper_bound": 27320.336657093754, "actual_sales": null, "forecast_sales": 20944.55863398213, "smoothed_sales": 21563.951311419412, "trend_component": 21563.951311419412, "weekly_component": -619.3926774372799, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774372799}, {"date": "2026-04-26", "event_icon": "ai_predicted", "lower_bound": 18900.202240703155, "upper_bound": 31009.042166397114, "actual_sales": null, "forecast_sales": 24695.79608137343, "smoothed_sales": 21989.4482626208, "trend_component": 21989.4482626208, "weekly_component": 2706.347818752629, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.347818752629}, {"date": "2026-04-27", "event_icon": "ai_predicted", "lower_bound": 14520.18908387738, "upper_bound": 26999.962758551028, "actual_sales": null, "forecast_sales": 20531.539789581948, "smoothed_sales": 22414.945213822186, "trend_component": 22414.945213822186, "weekly_component": -1883.4054242402387, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242402387}, {"date": "2026-04-28", "event_icon": "ai_predicted", "lower_bound": 15890.807562480284, "upper_bound": 27936.60074007424, "actual_sales": null, "forecast_sales": 22040.298268063434, "smoothed_sales": 22840.44216502357, "trend_component": 22840.44216502357, "weekly_component": -800.1438969601371, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969601371}, {"date": "2026-04-29", "event_icon": "ai_predicted", "lower_bound": 17658.815766554006, "upper_bound": 29411.38454224217, "actual_sales": null, "forecast_sales": 23460.588907694153, "smoothed_sales": 23265.939116224945, "trend_component": 23265.939116224945, "weekly_component": 194.64979146920837, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979146920837}, {"date": "2026-04-30", "event_icon": "ai_predicted", "lower_bound": 16954.667123683015, "upper_bound": 29204.159846236882, "actual_sales": null, "forecast_sales": 23152.17451650214, "smoothed_sales": 23691.43606742633, "trend_component": 23691.43606742633, "weekly_component": -539.261550924193, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.261550924193}, {"date": "2026-05-01", "event_icon": "ai_predicted", "lower_bound": 19029.69586232976, "upper_bound": 31414.341051943346, "actual_sales": null, "forecast_sales": 25058.13895796859, "smoothed_sales": 24116.933018627715, "trend_component": 24116.933018627715, "weekly_component": 941.2059393438631, "yearly_component": 0.0, "holidays_component": -0.00000000298699491538224, "seasonal_component": 941.2059393438632}, {"date": "2026-05-02", "event_icon": "ai_predicted", "lower_bound": 17801.686901383382, "upper_bound": 30299.773198609277, "actual_sales": null, "forecast_sales": 23923.037292394278, "smoothed_sales": 24542.429969829103, "trend_component": 24542.429969829103, "weekly_component": -619.3926774348253, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -619.3926774348253}, {"date": "2026-05-03", "event_icon": "ai_predicted", "lower_bound": 21306.220599663637, "upper_bound": 33913.703939167906, "actual_sales": null, "forecast_sales": 27674.27473978155, "smoothed_sales": 24967.92692103049, "trend_component": 24967.92692103049, "weekly_component": 2706.3478187510627, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 2706.3478187510627}, {"date": "2026-05-04", "event_icon": "ai_predicted", "lower_bound": 17814.900343629153, "upper_bound": 29603.950718242613, "actual_sales": null, "forecast_sales": 23510.018447984377, "smoothed_sales": 25393.423872231873, "trend_component": 25393.423872231873, "weekly_component": -1883.4054242474965, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -1883.4054242474965}, {"date": "2026-05-05", "event_icon": "ai_predicted", "lower_bound": 18854.27298294096, "upper_bound": 31183.91502778741, "actual_sales": null, "forecast_sales": 25018.77692647805, "smoothed_sales": 25818.92082343326, "trend_component": 25818.92082343326, "weekly_component": -800.1438969552055, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -800.1438969552055}, {"date": "2026-05-06", "event_icon": "ai_predicted", "lower_bound": 20584.489210721862, "upper_bound": 32634.17249260164, "actual_sales": null, "forecast_sales": 26439.06756610728, "smoothed_sales": 26244.417774634643, "trend_component": 26244.417774634643, "weekly_component": 194.64979147263492, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 194.64979147263492}, {"date": "2026-05-07", "event_icon": "ai_predicted", "lower_bound": 19941.483084501328, "upper_bound": 32455.183665762284, "actual_sales": null, "forecast_sales": 26130.653174909043, "smoothed_sales": 26669.914725836028, "trend_component": 26669.914725836028, "weekly_component": -539.261550926987, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": -539.261550926987}, {"date": "2026-05-08", "event_icon": "ai_predicted", "lower_bound": 21431.21953042878, "upper_bound": 34205.30050039783, "actual_sales": null, "forecast_sales": 28036.61761637661, "smoothed_sales": 27095.411677037413, "trend_component": 27095.411677037413, "weekly_component": 941.2059393391991, "yearly_component": 0.0, "holidays_component": 0.0, "seasonal_component": 941.2059393391991}], "model_status": null, "forecast_engine": "prophet", "trend_direction": "up", "forecast_accuracy": 19.23210490256659, "product_forecasts": [{"confidence": 0.2, "product_id": 1, "reorder_by": null, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 2, "reorder_by": null, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 3, "reorder_by": null, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 4, "reorder_by": null, "product_name": "HONDA GOLD 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 5, "reorder_by": null, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 7, "reorder_by": null, "product_name": "HONDA RED 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 8, "reorder_by": null, "product_name": "HONDA GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.2, "product_id": 9, "reorder_by": null, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 10, "reorder_by": null, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 11, "reorder_by": null, "product_name": "WD-40 333ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 12, "reorder_by": null, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 14, "reorder_by": null, "product_name": "GASKET MAKER PITSTOP 30G", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 16, "reorder_by": null, "product_name": "CVT FI CLEANER PRO 450ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 21, "reorder_by": null, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 22, "reorder_by": null, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 23, "reorder_by": null, "product_name": "OIL FILTER HJLX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 24, "reorder_by": null, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 25, "reorder_by": null, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 28, "reorder_by": "2026-04-11", "product_name": "MOTUL SCT 800ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 29, "reorder_by": "2026-04-11", "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 18, "reorder_by": null, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 19, "reorder_by": null, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 20, "reorder_by": null, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 15, "reorder_by": null, "product_name": "CVT CLEANER RS8", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 13, "reorder_by": null, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 17, "reorder_by": null, "product_name": "FORK OIL GENERIC", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 6, "reorder_by": null, "product_name": "HONDA BLUE 1L", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 100.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 27, "reorder_by": null, "product_name": "BEARING KOYO 6004", "current_stock": 8, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 26, "reorder_by": null, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 100.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 303, "reorder_by": null, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 227, "reorder_by": null, "product_name": "AIR FILTER KLX140", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 376, "reorder_by": null, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 56.25000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 30, "reorder_by": null, "product_name": "ZIC M9 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 31, "reorder_by": null, "product_name": "ZIC M9 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 32, "reorder_by": null, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 33, "reorder_by": null, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 34, "reorder_by": null, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 35, "reorder_by": null, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 36, "reorder_by": null, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 37, "reorder_by": null, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 38, "reorder_by": null, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 39, "reorder_by": null, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 40, "reorder_by": null, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 41, "reorder_by": null, "product_name": "PETRON SR200 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 42, "reorder_by": null, "product_name": "BEARING KOYO 6005", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 43, "reorder_by": null, "product_name": "BEARING KOYO 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 44, "reorder_by": null, "product_name": "BEARING KOYO 6201", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 45, "reorder_by": null, "product_name": "BEARING KOYO 6202", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 46, "reorder_by": null, "product_name": "BEARING KOYO 6203", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 47, "reorder_by": null, "product_name": "BEARING KOYO 6204", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 48, "reorder_by": null, "product_name": "BEARING KOYO 6205", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 49, "reorder_by": null, "product_name": "BEARING KOYO 6300", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 50, "reorder_by": null, "product_name": "BEARING KOYO 6301", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 51, "reorder_by": null, "product_name": "BEARING KOYO 6302", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 52, "reorder_by": null, "product_name": "BEARING NSK 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 53, "reorder_by": null, "product_name": "BEARING NSK 6302", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 54, "reorder_by": null, "product_name": "BEARING NSK 6004", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 55, "reorder_by": null, "product_name": "BEARING KSR 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 56, "reorder_by": null, "product_name": "BEARING KSR 6204", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 57, "reorder_by": null, "product_name": "KSR 6004", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 58, "reorder_by": null, "product_name": "KSR 6005", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 59, "reorder_by": null, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 60, "reorder_by": null, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 61, "reorder_by": null, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 62, "reorder_by": null, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 63, "reorder_by": null, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 64, "reorder_by": null, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 65, "reorder_by": null, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 66, "reorder_by": null, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 67, "reorder_by": null, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 68, "reorder_by": null, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 69, "reorder_by": null, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 70, "reorder_by": null, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 71, "reorder_by": null, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 72, "reorder_by": null, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_id": 73, "reorder_by": null, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 74, "reorder_by": null, "product_name": "DOMINO SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 75, "reorder_by": null, "product_name": "STARTER SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 76, "reorder_by": null, "product_name": "BRAKE SWITCH L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 77, "reorder_by": null, "product_name": "BRAKE SWITCH R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 78, "reorder_by": null, "product_name": "ON/OFF SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 79, "reorder_by": null, "product_name": "HORN SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 80, "reorder_by": null, "product_name": "HAZARD SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 81, "reorder_by": null, "product_name": "H/L SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 82, "reorder_by": null, "product_name": "HOLLOW SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 83, "reorder_by": null, "product_name": "L/R SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 84, "reorder_by": null, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 85, "reorder_by": null, "product_name": "PITO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 86, "reorder_by": null, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 87, "reorder_by": null, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 88, "reorder_by": null, "product_name": "ALLEN BOLT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 89, "reorder_by": null, "product_name": "HORN RELAY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 90, "reorder_by": null, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 91, "reorder_by": null, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 92, "reorder_by": null, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 93, "reorder_by": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 94, "reorder_by": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 95, "reorder_by": null, "product_name": "FORK OIL SEAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 96, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 97, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 98, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 315, "reorder_by": null, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 307, "reorder_by": null, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 99, "reorder_by": null, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 100, "reorder_by": null, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 101, "reorder_by": null, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 102, "reorder_by": null, "product_name": "FUSE 10A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 103, "reorder_by": null, "product_name": "FUSE 15A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 104, "reorder_by": null, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 105, "reorder_by": null, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 106, "reorder_by": null, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 107, "reorder_by": null, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 108, "reorder_by": null, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 109, "reorder_by": null, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 110, "reorder_by": null, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 111, "reorder_by": null, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 112, "reorder_by": null, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 113, "reorder_by": null, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 114, "reorder_by": null, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 115, "reorder_by": null, "product_name": "WASHER 10", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 116, "reorder_by": null, "product_name": "WASHER 12", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 117, "reorder_by": null, "product_name": "WASHER 14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 118, "reorder_by": null, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 119, "reorder_by": null, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 120, "reorder_by": null, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 121, "reorder_by": null, "product_name": "EXHAUST GASKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 122, "reorder_by": null, "product_name": "PASAK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 123, "reorder_by": null, "product_name": "FLARINGS SCREW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 124, "reorder_by": null, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 125, "reorder_by": null, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 127, "reorder_by": null, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 128, "reorder_by": null, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 129, "reorder_by": null, "product_name": "CP HOLDER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 130, "reorder_by": null, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 131, "reorder_by": null, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 132, "reorder_by": null, "product_name": "GRASA KOBY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 133, "reorder_by": null, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 134, "reorder_by": null, "product_name": "WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 135, "reorder_by": null, "product_name": "BRAKE PAD M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 136, "reorder_by": null, "product_name": "COOLANT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 137, "reorder_by": null, "product_name": "REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 138, "reorder_by": null, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 139, "reorder_by": null, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 140, "reorder_by": null, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 141, "reorder_by": null, "product_name": "THROTTLE CABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 142, "reorder_by": null, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 143, "reorder_by": null, "product_name": "O-RING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 144, "reorder_by": null, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 145, "reorder_by": null, "product_name": "HORN SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 146, "reorder_by": null, "product_name": "HORN HELLA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 147, "reorder_by": null, "product_name": "STARTER RELAY MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 148, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 149, "reorder_by": null, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 150, "reorder_by": null, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 151, "reorder_by": null, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 154, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 155, "reorder_by": null, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 156, "reorder_by": null, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 157, "reorder_by": null, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 158, "reorder_by": null, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 159, "reorder_by": null, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 160, "reorder_by": null, "product_name": "HORN BOSCH 190", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 161, "reorder_by": null, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 162, "reorder_by": null, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 163, "reorder_by": null, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_id": 164, "reorder_by": null, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 165, "reorder_by": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 166, "reorder_by": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 167, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 168, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 169, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 170, "reorder_by": null, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 171, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 172, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 173, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 174, "reorder_by": null, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 175, "reorder_by": null, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 176, "reorder_by": null, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 177, "reorder_by": null, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 178, "reorder_by": null, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 179, "reorder_by": null, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 180, "reorder_by": null, "product_name": "FUSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.2, "product_id": 181, "reorder_by": null, "product_name": "STARTER RELAY XR200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 182, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 183, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 184, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 185, "reorder_by": null, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 186, "reorder_by": null, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 187, "reorder_by": null, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 188, "reorder_by": null, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 190, "reorder_by": null, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 191, "reorder_by": null, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 192, "reorder_by": null, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 193, "reorder_by": null, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 194, "reorder_by": null, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 195, "reorder_by": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 196, "reorder_by": null, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 197, "reorder_by": null, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 198, "reorder_by": null, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 199, "reorder_by": null, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 200, "reorder_by": null, "product_name": "FUEL COCK CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 201, "reorder_by": null, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 202, "reorder_by": null, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 203, "reorder_by": null, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 204, "reorder_by": null, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 205, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 126, "reorder_by": null, "product_name": "ABETA GREY", "current_stock": 7, "reorder_level": 5, "days_to_stockout": 43.75000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 206, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 207, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 208, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 209, "reorder_by": null, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 210, "reorder_by": null, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 211, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 212, "reorder_by": null, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 213, "reorder_by": null, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 214, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 215, "reorder_by": null, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 216, "reorder_by": null, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 217, "reorder_by": null, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 218, "reorder_by": null, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 219, "reorder_by": null, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 220, "reorder_by": null, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 221, "reorder_by": null, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 222, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 223, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 224, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 225, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 226, "reorder_by": null, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 228, "reorder_by": null, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 229, "reorder_by": null, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 230, "reorder_by": null, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 231, "reorder_by": null, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 232, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 233, "reorder_by": null, "product_name": "CABLE TIE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 234, "reorder_by": null, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 235, "reorder_by": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 236, "reorder_by": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 237, "reorder_by": null, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 238, "reorder_by": null, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 239, "reorder_by": null, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 240, "reorder_by": null, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 241, "reorder_by": null, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 242, "reorder_by": null, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 243, "reorder_by": null, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 244, "reorder_by": null, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 245, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 246, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 247, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 248, "reorder_by": null, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 249, "reorder_by": null, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 250, "reorder_by": null, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 251, "reorder_by": null, "product_name": "TIRE SEALANT BR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 252, "reorder_by": null, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 253, "reorder_by": null, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 254, "reorder_by": null, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 255, "reorder_by": null, "product_name": "GEAR OIL PETRON", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 256, "reorder_by": null, "product_name": "RS8 R9 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.2, "product_id": 257, "reorder_by": null, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 258, "reorder_by": null, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 259, "reorder_by": null, "product_name": "CLUTCH LEVER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.2, "product_id": 260, "reorder_by": null, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 261, "reorder_by": null, "product_name": "NUT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 262, "reorder_by": null, "product_name": "BOLT STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 263, "reorder_by": null, "product_name": "NUT STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 41.66666666666667, "predicted_demand_30d": 7.199999999999999}, {"confidence": 0.7, "product_id": 264, "reorder_by": null, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 265, "reorder_by": null, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.2, "product_id": 266, "reorder_by": null, "product_name": "STEEL NUT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 267, "reorder_by": null, "product_name": "WELDING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 268, "reorder_by": null, "product_name": "REGULATOR BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 269, "reorder_by": null, "product_name": "USED OIL 1DRUM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 270, "reorder_by": null, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 271, "reorder_by": null, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 273, "reorder_by": null, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 274, "reorder_by": null, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 275, "reorder_by": null, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 276, "reorder_by": null, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 277, "reorder_by": null, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 278, "reorder_by": null, "product_name": "HANDLE GRIP *", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 281, "reorder_by": null, "product_name": "PETRON SCT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 282, "reorder_by": null, "product_name": "O-RING CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 283, "reorder_by": null, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 41.66666666666667, "predicted_demand_30d": 7.199999999999999}, {"confidence": 0.7, "product_id": 284, "reorder_by": null, "product_name": "INTERIOR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 285, "reorder_by": null, "product_name": "OIL SEAL 200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 286, "reorder_by": null, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 287, "reorder_by": null, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 293, "reorder_by": null, "product_name": "BATTERY CHARGING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 294, "reorder_by": null, "product_name": "RELAY SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 295, "reorder_by": null, "product_name": "DID CHAIN 428H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 297, "reorder_by": null, "product_name": "CDI 300", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 298, "reorder_by": null, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 299, "reorder_by": null, "product_name": "CLUTCH SPRING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 300, "reorder_by": null, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 302, "reorder_by": null, "product_name": "PETRON SC400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 305, "reorder_by": null, "product_name": "AREGULATOR LAM9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 308, "reorder_by": null, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 309, "reorder_by": null, "product_name": "BRAKE CABLE 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 311, "reorder_by": null, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 312, "reorder_by": null, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 313, "reorder_by": null, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 314, "reorder_by": null, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 316, "reorder_by": null, "product_name": "CLUTCH LINING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 317, "reorder_by": null, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 318, "reorder_by": null, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 292, "reorder_by": null, "product_name": "ROTOR DISC", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 291, "reorder_by": null, "product_name": "DIODE", "current_stock": 8, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 290, "reorder_by": null, "product_name": "INTERIOR 2.75", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 337.5, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 279, "reorder_by": null, "product_name": "ACOOLANT", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 310, "reorder_by": null, "product_name": "AINTERIOR KRX", "current_stock": 8, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 304, "reorder_by": null, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 319, "reorder_by": null, "product_name": "CARBON BRUSH 120", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 320, "reorder_by": null, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 321, "reorder_by": null, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 325, "reorder_by": null, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 326, "reorder_by": null, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 327, "reorder_by": null, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 328, "reorder_by": null, "product_name": "BRAKE PAD 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 329, "reorder_by": null, "product_name": "HONDA SCT GREY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 330, "reorder_by": null, "product_name": "SPROCKET SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 331, "reorder_by": null, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 332, "reorder_by": null, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 333, "reorder_by": null, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 334, "reorder_by": null, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 335, "reorder_by": null, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 336, "reorder_by": null, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 337, "reorder_by": null, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.2, "product_id": 338, "reorder_by": null, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 339, "reorder_by": null, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 340, "reorder_by": null, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 341, "reorder_by": null, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 342, "reorder_by": null, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 343, "reorder_by": null, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 344, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 345, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 346, "reorder_by": null, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 347, "reorder_by": null, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 348, "reorder_by": null, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 349, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 350, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 351, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 352, "reorder_by": null, "product_name": "BEARING KOYO 6002", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 353, "reorder_by": null, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 354, "reorder_by": null, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 355, "reorder_by": null, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 356, "reorder_by": null, "product_name": "IGNITION COIL KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 357, "reorder_by": null, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 358, "reorder_by": null, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 359, "reorder_by": null, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 360, "reorder_by": null, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 361, "reorder_by": null, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 362, "reorder_by": null, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 363, "reorder_by": null, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 364, "reorder_by": null, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 365, "reorder_by": null, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 366, "reorder_by": null, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 367, "reorder_by": null, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 368, "reorder_by": null, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 369, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 370, "reorder_by": null, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 371, "reorder_by": null, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 372, "reorder_by": null, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 373, "reorder_by": null, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 374, "reorder_by": null, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 375, "reorder_by": null, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 377, "reorder_by": null, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 378, "reorder_by": null, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 379, "reorder_by": null, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 380, "reorder_by": null, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 381, "reorder_by": null, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 382, "reorder_by": null, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 383, "reorder_by": null, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 385, "reorder_by": null, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 386, "reorder_by": null, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 387, "reorder_by": null, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 388, "reorder_by": null, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 389, "reorder_by": null, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.2, "product_id": 390, "reorder_by": null, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 391, "reorder_by": null, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 392, "reorder_by": null, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_id": 393, "reorder_by": null, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 394, "reorder_by": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 395, "reorder_by": null, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 396, "reorder_by": null, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 397, "reorder_by": null, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 398, "reorder_by": null, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 399, "reorder_by": null, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 400, "reorder_by": null, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 401, "reorder_by": null, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 402, "reorder_by": null, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 403, "reorder_by": null, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 404, "reorder_by": null, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 405, "reorder_by": null, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 406, "reorder_by": null, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 407, "reorder_by": null, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 408, "reorder_by": null, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 409, "reorder_by": null, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 410, "reorder_by": null, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 411, "reorder_by": null, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 412, "reorder_by": null, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 413, "reorder_by": null, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 414, "reorder_by": null, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 415, "reorder_by": null, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 416, "reorder_by": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 417, "reorder_by": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 418, "reorder_by": null, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 419, "reorder_by": null, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 34.09090909090909, "predicted_demand_30d": 8.8}, {"confidence": 0.2, "product_id": 420, "reorder_by": null, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 421, "reorder_by": null, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 422, "reorder_by": null, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 423, "reorder_by": null, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 424, "reorder_by": null, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 426, "reorder_by": null, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 427, "reorder_by": null, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 428, "reorder_by": null, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 322, "reorder_by": null, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 48.214285714285715, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 324, "reorder_by": null, "product_name": "A6300", "current_stock": 7, "reorder_level": 5, "days_to_stockout": 87.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 429, "reorder_by": null, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 430, "reorder_by": null, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 431, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 432, "reorder_by": null, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 433, "reorder_by": null, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 434, "reorder_by": null, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 435, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 436, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 437, "reorder_by": null, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 438, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 439, "reorder_by": null, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 440, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 441, "reorder_by": null, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 442, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 444, "reorder_by": null, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 445, "reorder_by": null, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 446, "reorder_by": null, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 447, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 448, "reorder_by": null, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 449, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 450, "reorder_by": null, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_id": 451, "reorder_by": null, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 452, "reorder_by": null, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_id": 453, "reorder_by": null, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_id": 454, "reorder_by": null, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 455, "reorder_by": null, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 456, "reorder_by": null, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_id": 457, "reorder_by": null, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_id": 458, "reorder_by": null, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 459, "reorder_by": null, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 460, "reorder_by": null, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 461, "reorder_by": null, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 462, "reorder_by": null, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 463, "reorder_by": null, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.2, "product_id": 464, "reorder_by": null, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 443, "reorder_by": null, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 168.75, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_id": 323, "reorder_by": null, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 301, "reorder_by": null, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 42.857142857142854, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.2, "product_id": 153, "reorder_by": null, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 425, "reorder_by": null, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.2, "product_id": 280, "reorder_by": null, "product_name": "AJVT GEAR OIL", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 306, "reorder_by": null, "product_name": "AKRX TUBE", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_id": 296, "reorder_by": null, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 60.0, "predicted_demand_30d": 4.0}, {"confidence": 0.2, "product_id": 288, "reorder_by": null, "product_name": "AXLE EHE TMX", "current_stock": 9, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 189, "reorder_by": null, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 168.75, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.2, "product_id": 272, "reorder_by": null, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 152, "reorder_by": "2026-04-11", "product_name": "AIR FILTER CLICK125", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_id": 384, "reorder_by": "2026-04-11", "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_id": 289, "reorder_by": "2026-04-11", "product_name": "ADD OIL PETRON", "current_stock": 3, "reorder_level": 5, "days_to_stockout": 16.07142857142857, "predicted_demand_30d": 5.6000000000000005}], "served_from_cache": false, "cache_generated_at": null, "next_period_forecast": 628173.120926941}, "generated_at": "2026-04-07T20:06:27.012585+00:00", "forecast_days": 90}	prophet	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020	2026-04-08 05:06:27.012595
stock_prediction	{"response": {"risk_stats": {"low_risk": 445, "high_risk": 4, "medium_risk": 12, "avg_days_to_stockout": 171.3}, "model_status": null, "risk_analysis": [{"confidence": 0.15, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HONDA GOLD 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "HONDA RED 1L", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "HONDA GEAR OIL", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.15, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "OIL FILTER HJLX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "MOTUL SCT 800ML", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "days_to_stockout": 75.0, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CVT CLEANER RS8", "current_stock": 9, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "FORK OIL GENERIC", "current_stock": 9, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HONDA BLUE 1L", "current_stock": 8, "days_to_stockout": 100.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BEARING KOYO 6004", "current_stock": 8, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "days_to_stockout": 100.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "AIR FILTER KLX140", "current_stock": 9, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "days_to_stockout": 56.25000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "ZIC M9 800ML", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "ZIC M9 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "PETRON SR200 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6005", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6200", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6201", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6202", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "BEARING KOYO 6203", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6204", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6205", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6300", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6301", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BEARING KOYO 6302", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING NSK 6200", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BEARING NSK 6302", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING NSK 6004", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "BEARING KSR 6200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KSR 6204", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "KSR 6004", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "KSR 6005", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "DOMINO SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "STARTER SWITCH", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE SWITCH L", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE SWITCH R", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "ON/OFF SWITCH", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "HORN SWITCH", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "HAZARD SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "H/L SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HOLLOW SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "L/R SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PITO", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ALLEN BOLT", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HORN RELAY", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "FORK OIL SEAL", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUSE 10A", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUSE 15A", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WASHER 10", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "WASHER 12", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "WASHER 14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "EXHAUST GASKET", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "PASAK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLARINGS SCREW", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "CP HOLDER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "GRASA KOBY", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WASHER", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE PAD M3", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "COOLANT", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "REPAIR KIT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "THROTTLE CABLE", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "O-RING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HORN SOCKET", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HORN HELLA", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "STARTER RELAY MIO", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "HORN BOSCH 190", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "FUSE", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.15, "product_name": "STARTER RELAY XR200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "FUEL COCK CB400", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "ABETA GREY", "current_stock": 7, "days_to_stockout": 43.75000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "CABLE TIE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "TIRE SEALANT BR", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "GEAR OIL PETRON", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "RS8 R9 1L", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.15, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH LEVER", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "NUT", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BOLT STAINLESS", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "NUT STAINLESS", "current_stock": 10, "days_to_stockout": 41.66666666666667, "predicted_demand_30d": 7.199999999999999}, {"confidence": 0.7, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.15, "product_name": "STEEL NUT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WELDING", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "REGULATOR BARAKO", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "USED OIL 1DRUM", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HANDLE GRIP *", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "PETRON SCT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "O-RING CLICK", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "days_to_stockout": 41.66666666666667, "predicted_demand_30d": 7.199999999999999}, {"confidence": 0.7, "product_name": "INTERIOR", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "OIL SEAL 200", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "BATTERY CHARGING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "RELAY SOCKET", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "DID CHAIN 428H", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "CDI 300", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH SPRING", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PETRON SC400", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "AREGULATOR LAM9", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE CABLE 150", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "CLUTCH LINING", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ROTOR DISC", "current_stock": 9, "days_to_stockout": 84.375, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "DIODE", "current_stock": 8, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "INTERIOR 2.75", "current_stock": 9, "days_to_stockout": 337.5, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "ACOOLANT", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "AINTERIOR KRX", "current_stock": 8, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CARBON BRUSH 120", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE PAD 150", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "HONDA SCT GREY", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SPROCKET SET", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.15, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6002", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "IGNITION COIL KHC", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.15, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "days_to_stockout": 62.50000000000001, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "days_to_stockout": 34.09090909090909, "predicted_demand_30d": 8.8}, {"confidence": 0.15, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "days_to_stockout": 48.214285714285715, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "A6300", "current_stock": 7, "days_to_stockout": 87.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "days_to_stockout": 75.0, "predicted_demand_30d": 4.0}, {"confidence": 0.7, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "days_to_stockout": 46.875, "predicted_demand_30d": 6.3999999999999995}, {"confidence": 0.7, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "days_to_stockout": 53.57142857142857, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.7, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "days_to_stockout": 37.5, "predicted_demand_30d": 8.0}, {"confidence": 0.7, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "days_to_stockout": 93.75, "predicted_demand_30d": 3.1999999999999997}, {"confidence": 0.7, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "days_to_stockout": 187.5, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "days_to_stockout": 375.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "days_to_stockout": 125.00000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.15, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "days_to_stockout": 168.75, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.7, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "days_to_stockout": 300.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "days_to_stockout": 42.857142857142854, "predicted_demand_30d": 5.6000000000000005}, {"confidence": 0.15, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "days_to_stockout": 300.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.15, "product_name": "AJVT GEAR OIL", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AKRX TUBE", "current_stock": 9, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.3999999999999995}, {"confidence": 0.7, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "days_to_stockout": 60.0, "predicted_demand_30d": 4.0}, {"confidence": 0.15, "product_name": "AXLE EHE TMX", "current_stock": 9, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "days_to_stockout": 168.75, "predicted_demand_30d": 1.5999999999999999}, {"confidence": 0.15, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AIR FILTER CLICK125", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 4.799999999999999}, {"confidence": 0.7, "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 0.7999999999999999}, {"confidence": 0.7, "product_name": "ADD OIL PETRON", "current_stock": 3, "days_to_stockout": 16.07142857142857, "predicted_demand_30d": 5.6000000000000005}], "critical_items": [{"product_name": "MOTUL SCT 800ML", "days_to_stockout": 0.0, "recommended_order": 8}, {"product_name": "MOTUL GP MATIC 1L", "days_to_stockout": 0.0, "recommended_order": 8}, {"product_name": "AIR FILTER CLICK125", "days_to_stockout": 0.0, "recommended_order": 11}, {"product_name": "ADD OIL PETRON / RACERX 200M", "days_to_stockout": 0.0, "recommended_order": 8}, {"product_name": "ADD OIL PETRON", "days_to_stockout": 16.07142857142857, "recommended_order": 9}], "forecast_engine": "rolling_average", "served_from_cache": false, "cache_generated_at": null, "horizon_predictions": [{"urgency": "Medium", "stock_30d": 5.5, "stock_60d": 5.5, "stock_90d": 5.5, "product_id": 1, "supplier_id": 3, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 2, "supplier_id": 3, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 3, "supplier_id": 6, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "supplier_name": "Corsa Tires: JKSS tire center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 4, "supplier_id": 1, "product_name": "HONDA GOLD 1L", "current_stock": 10, "supplier_name": "Oils and tires", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 5, "supplier_id": 1, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "supplier_name": "Oils and tires", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 7, "supplier_id": 3, "product_name": "HONDA RED 1L", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 8, "supplier_id": 1, "product_name": "HONDA GEAR OIL", "current_stock": 10, "supplier_name": "Oils and tires", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 9, "supplier_id": 3, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 10, "supplier_id": 3, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 12, "supplier_id": 3, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 21, "supplier_id": 3, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 22, "supplier_id": 2, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 23, "supplier_id": 2, "product_name": "OIL FILTER HJLX", "current_stock": 10, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 24, "supplier_id": 2, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 25, "supplier_id": 2, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 28, "supplier_id": null, "product_name": "MOTUL SCT 800ML", "current_stock": 0, "supplier_name": "Unassigned", "recommended_order": 8}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 29, "supplier_id": null, "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "supplier_name": "Unassigned", "recommended_order": 8}, {"urgency": "Low", "stock_30d": 5.300000000000001, "stock_60d": 2.1000000000000005, "stock_90d": 0.0, "product_id": 18, "supplier_id": 2, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 8.5, "stock_90d": 8.5, "product_id": 19, "supplier_id": 2, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 20, "supplier_id": 2, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.300000000000001, "stock_60d": 3.1000000000000005, "stock_90d": 0.0, "product_id": 15, "supplier_id": 6, "product_name": "CVT CLEANER RS8", "current_stock": 9, "supplier_name": "Corsa Tires: JKSS tire center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.1000000000000005, "stock_60d": 4.700000000000001, "stock_90d": 2.3000000000000007, "product_id": 13, "supplier_id": 2, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.1000000000000005, "stock_60d": 4.700000000000001, "stock_90d": 2.3000000000000007, "product_id": 17, "supplier_id": 3, "product_name": "FORK OIL GENERIC", "current_stock": 9, "supplier_name": "Al Cycle and Lube Center", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.1000000000000005, "stock_60d": 3.700000000000001, "stock_90d": 1.3000000000000007, "product_id": 6, "supplier_id": 1, "product_name": "HONDA BLUE 1L", "current_stock": 8, "supplier_name": "Oils and tires", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 8.5, "stock_90d": 8.5, "product_id": 27, "supplier_id": 2, "product_name": "BEARING KOYO 6004", "current_stock": 8, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.1000000000000005, "stock_60d": 3.700000000000001, "stock_90d": 1.3000000000000007, "product_id": 26, "supplier_id": 2, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "supplier_name": "Jvt and cworks products", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.1000000000000005, "stock_60d": 4.700000000000001, "stock_90d": 2.3000000000000007, "product_id": 303, "supplier_id": null, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.300000000000001, "stock_60d": 3.1000000000000005, "stock_90d": 0.0, "product_id": 227, "supplier_id": null, "product_name": "AIR FILTER KLX140", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.700000000000001, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 376, "supplier_id": null, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 30, "supplier_id": null, "product_name": "ZIC M9 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 31, "supplier_id": null, "product_name": "ZIC M9 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 32, "supplier_id": null, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 33, "supplier_id": null, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 34, "supplier_id": null, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 35, "supplier_id": null, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 36, "supplier_id": null, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 37, "supplier_id": null, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 38, "supplier_id": null, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 39, "supplier_id": null, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 40, "supplier_id": null, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 41, "supplier_id": null, "product_name": "PETRON SR200 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 42, "supplier_id": null, "product_name": "BEARING KOYO 6005", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 43, "supplier_id": null, "product_name": "BEARING KOYO 6200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 44, "supplier_id": null, "product_name": "BEARING KOYO 6201", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 45, "supplier_id": null, "product_name": "BEARING KOYO 6202", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 46, "supplier_id": null, "product_name": "BEARING KOYO 6203", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 47, "supplier_id": null, "product_name": "BEARING KOYO 6204", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 48, "supplier_id": null, "product_name": "BEARING KOYO 6205", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 49, "supplier_id": null, "product_name": "BEARING KOYO 6300", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 50, "supplier_id": null, "product_name": "BEARING KOYO 6301", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 51, "supplier_id": null, "product_name": "BEARING KOYO 6302", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 52, "supplier_id": null, "product_name": "BEARING NSK 6200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 53, "supplier_id": null, "product_name": "BEARING NSK 6302", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 54, "supplier_id": null, "product_name": "BEARING NSK 6004", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 55, "supplier_id": null, "product_name": "BEARING KSR 6200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 56, "supplier_id": null, "product_name": "BEARING KSR 6204", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 57, "supplier_id": null, "product_name": "KSR 6004", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 58, "supplier_id": null, "product_name": "KSR 6005", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 59, "supplier_id": null, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 60, "supplier_id": null, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 61, "supplier_id": null, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 62, "supplier_id": null, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 63, "supplier_id": null, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 64, "supplier_id": null, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 65, "supplier_id": null, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 66, "supplier_id": null, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 67, "supplier_id": null, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 68, "supplier_id": null, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 69, "supplier_id": null, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 70, "supplier_id": null, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 71, "supplier_id": null, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.5, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 72, "supplier_id": null, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 73, "supplier_id": null, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 74, "supplier_id": null, "product_name": "DOMINO SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 75, "supplier_id": null, "product_name": "STARTER SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 76, "supplier_id": null, "product_name": "BRAKE SWITCH L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 77, "supplier_id": null, "product_name": "BRAKE SWITCH R", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 78, "supplier_id": null, "product_name": "ON/OFF SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 79, "supplier_id": null, "product_name": "HORN SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 80, "supplier_id": null, "product_name": "HAZARD SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 81, "supplier_id": null, "product_name": "H/L SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 82, "supplier_id": null, "product_name": "HOLLOW SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 83, "supplier_id": null, "product_name": "L/R SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 84, "supplier_id": null, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 85, "supplier_id": null, "product_name": "PITO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 86, "supplier_id": null, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 87, "supplier_id": null, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 88, "supplier_id": null, "product_name": "ALLEN BOLT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 89, "supplier_id": null, "product_name": "HORN RELAY", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 90, "supplier_id": null, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 91, "supplier_id": null, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 92, "supplier_id": null, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 93, "supplier_id": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 94, "supplier_id": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 95, "supplier_id": null, "product_name": "FORK OIL SEAL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 96, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 97, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 98, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.5, "stock_60d": 7.5, "stock_90d": 7.5, "product_id": 315, "supplier_id": null, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 8.5, "stock_90d": 8.5, "product_id": 307, "supplier_id": null, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 99, "supplier_id": null, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 100, "supplier_id": null, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 101, "supplier_id": null, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 102, "supplier_id": null, "product_name": "FUSE 10A", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 103, "supplier_id": null, "product_name": "FUSE 15A", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 104, "supplier_id": null, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 105, "supplier_id": null, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 106, "supplier_id": null, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 107, "supplier_id": null, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 108, "supplier_id": null, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 109, "supplier_id": null, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 110, "supplier_id": null, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 111, "supplier_id": null, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 112, "supplier_id": null, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 113, "supplier_id": null, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 114, "supplier_id": null, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 115, "supplier_id": null, "product_name": "WASHER 10", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 116, "supplier_id": null, "product_name": "WASHER 12", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 117, "supplier_id": null, "product_name": "WASHER 14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 118, "supplier_id": null, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 119, "supplier_id": null, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 120, "supplier_id": null, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 121, "supplier_id": null, "product_name": "EXHAUST GASKET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 122, "supplier_id": null, "product_name": "PASAK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 123, "supplier_id": null, "product_name": "FLARINGS SCREW", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 124, "supplier_id": null, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 125, "supplier_id": null, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 127, "supplier_id": null, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 128, "supplier_id": null, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 129, "supplier_id": null, "product_name": "CP HOLDER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 130, "supplier_id": null, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 131, "supplier_id": null, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 132, "supplier_id": null, "product_name": "GRASA KOBY", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 133, "supplier_id": null, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 134, "supplier_id": null, "product_name": "WASHER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 135, "supplier_id": null, "product_name": "BRAKE PAD M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 136, "supplier_id": null, "product_name": "COOLANT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 137, "supplier_id": null, "product_name": "REPAIR KIT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 138, "supplier_id": null, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 139, "supplier_id": null, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 140, "supplier_id": null, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 141, "supplier_id": null, "product_name": "THROTTLE CABLE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 142, "supplier_id": null, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 143, "supplier_id": null, "product_name": "O-RING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 144, "supplier_id": null, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 145, "supplier_id": null, "product_name": "HORN SOCKET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 146, "supplier_id": null, "product_name": "HORN HELLA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 147, "supplier_id": null, "product_name": "STARTER RELAY MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 148, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 149, "supplier_id": null, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 150, "supplier_id": null, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 151, "supplier_id": null, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 154, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 155, "supplier_id": null, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 156, "supplier_id": null, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 157, "supplier_id": null, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 158, "supplier_id": null, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 159, "supplier_id": null, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 160, "supplier_id": null, "product_name": "HORN BOSCH 190", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 161, "supplier_id": null, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 162, "supplier_id": null, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.5, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 163, "supplier_id": null, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 164, "supplier_id": null, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 165, "supplier_id": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 166, "supplier_id": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 167, "supplier_id": null, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 168, "supplier_id": null, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 169, "supplier_id": null, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 170, "supplier_id": null, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 171, "supplier_id": null, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 172, "supplier_id": null, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 173, "supplier_id": null, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 174, "supplier_id": null, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 175, "supplier_id": null, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 176, "supplier_id": null, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 177, "supplier_id": null, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 178, "supplier_id": null, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 179, "supplier_id": null, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 180, "supplier_id": null, "product_name": "FUSE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 181, "supplier_id": null, "product_name": "STARTER RELAY XR200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 182, "supplier_id": null, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 183, "supplier_id": null, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 184, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 185, "supplier_id": null, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 186, "supplier_id": null, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 187, "supplier_id": null, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 188, "supplier_id": null, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 190, "supplier_id": null, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 191, "supplier_id": null, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 192, "supplier_id": null, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 193, "supplier_id": null, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 194, "supplier_id": null, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 195, "supplier_id": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 196, "supplier_id": null, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 197, "supplier_id": null, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 198, "supplier_id": null, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 199, "supplier_id": null, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 200, "supplier_id": null, "product_name": "FUEL COCK CB400", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 201, "supplier_id": null, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 202, "supplier_id": null, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 203, "supplier_id": null, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 204, "supplier_id": null, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 205, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.700000000000001, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 126, "supplier_id": null, "product_name": "ABETA GREY", "current_stock": 7, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 206, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 207, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 208, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 209, "supplier_id": null, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 210, "supplier_id": null, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 211, "supplier_id": null, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 212, "supplier_id": null, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 213, "supplier_id": null, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 214, "supplier_id": null, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 215, "supplier_id": null, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 216, "supplier_id": null, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 217, "supplier_id": null, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 218, "supplier_id": null, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 219, "supplier_id": null, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 220, "supplier_id": null, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 221, "supplier_id": null, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 222, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 223, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 224, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 225, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 226, "supplier_id": null, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 228, "supplier_id": null, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 229, "supplier_id": null, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 230, "supplier_id": null, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 231, "supplier_id": null, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 232, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 233, "supplier_id": null, "product_name": "CABLE TIE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 234, "supplier_id": null, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 235, "supplier_id": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 236, "supplier_id": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 237, "supplier_id": null, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 238, "supplier_id": null, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 239, "supplier_id": null, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 240, "supplier_id": null, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 241, "supplier_id": null, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 242, "supplier_id": null, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 243, "supplier_id": null, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 244, "supplier_id": null, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 245, "supplier_id": null, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 246, "supplier_id": null, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 247, "supplier_id": null, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 248, "supplier_id": null, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 249, "supplier_id": null, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 250, "supplier_id": null, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 251, "supplier_id": null, "product_name": "TIRE SEALANT BR", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 252, "supplier_id": null, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 253, "supplier_id": null, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 254, "supplier_id": null, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 255, "supplier_id": null, "product_name": "GEAR OIL PETRON", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 256, "supplier_id": null, "product_name": "RS8 R9 1L", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 257, "supplier_id": null, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 258, "supplier_id": null, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 259, "supplier_id": null, "product_name": "CLUTCH LEVER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 260, "supplier_id": null, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 261, "supplier_id": null, "product_name": "NUT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 262, "supplier_id": null, "product_name": "BOLT STAINLESS", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 3.3000000000000007, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 263, "supplier_id": null, "product_name": "NUT STAINLESS", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 264, "supplier_id": null, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 265, "supplier_id": null, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 266, "supplier_id": null, "product_name": "STEEL NUT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 267, "supplier_id": null, "product_name": "WELDING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 268, "supplier_id": null, "product_name": "REGULATOR BARAKO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 269, "supplier_id": null, "product_name": "USED OIL 1DRUM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 270, "supplier_id": null, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 271, "supplier_id": null, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 273, "supplier_id": null, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 274, "supplier_id": null, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 275, "supplier_id": null, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 276, "supplier_id": null, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 277, "supplier_id": null, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 278, "supplier_id": null, "product_name": "HANDLE GRIP *", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 281, "supplier_id": null, "product_name": "PETRON SCT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 282, "supplier_id": null, "product_name": "O-RING CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 3.3000000000000007, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 283, "supplier_id": null, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 284, "supplier_id": null, "product_name": "INTERIOR", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 285, "supplier_id": null, "product_name": "OIL SEAL 200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 286, "supplier_id": null, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 287, "supplier_id": null, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 293, "supplier_id": null, "product_name": "BATTERY CHARGING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 294, "supplier_id": null, "product_name": "RELAY SOCKET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 295, "supplier_id": null, "product_name": "DID CHAIN 428H", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 297, "supplier_id": null, "product_name": "CDI 300", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 298, "supplier_id": null, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 299, "supplier_id": null, "product_name": "CLUTCH SPRING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 300, "supplier_id": null, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 302, "supplier_id": null, "product_name": "PETRON SC400", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 305, "supplier_id": null, "product_name": "AREGULATOR LAM9", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 308, "supplier_id": null, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 309, "supplier_id": null, "product_name": "BRAKE CABLE 150", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 311, "supplier_id": null, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 312, "supplier_id": null, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 313, "supplier_id": null, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 314, "supplier_id": null, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 316, "supplier_id": null, "product_name": "CLUTCH LINING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 317, "supplier_id": null, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 318, "supplier_id": null, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.300000000000001, "stock_60d": 3.1000000000000005, "stock_90d": 0.0, "product_id": 292, "supplier_id": null, "product_name": "ROTOR DISC", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 8.5, "stock_90d": 8.5, "product_id": 291, "supplier_id": null, "product_name": "DIODE", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.7, "stock_60d": 7.9, "stock_90d": 7.1, "product_id": 290, "supplier_id": null, "product_name": "INTERIOR 2.75", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 279, "supplier_id": null, "product_name": "ACOOLANT", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 8.5, "stock_90d": 8.5, "product_id": 310, "supplier_id": null, "product_name": "AINTERIOR KRX", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 304, "supplier_id": null, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 319, "supplier_id": null, "product_name": "CARBON BRUSH 120", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 320, "supplier_id": null, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 321, "supplier_id": null, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 325, "supplier_id": null, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 326, "supplier_id": null, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 327, "supplier_id": null, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 328, "supplier_id": null, "product_name": "BRAKE PAD 150", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 329, "supplier_id": null, "product_name": "HONDA SCT GREY", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 330, "supplier_id": null, "product_name": "SPROCKET SET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 331, "supplier_id": null, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 332, "supplier_id": null, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 333, "supplier_id": null, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 334, "supplier_id": null, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 335, "supplier_id": null, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 336, "supplier_id": null, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 337, "supplier_id": null, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 338, "supplier_id": null, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 339, "supplier_id": null, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 340, "supplier_id": null, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 341, "supplier_id": null, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 342, "supplier_id": null, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 343, "supplier_id": null, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 344, "supplier_id": null, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 345, "supplier_id": null, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 346, "supplier_id": null, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 347, "supplier_id": null, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 348, "supplier_id": null, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 349, "supplier_id": null, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 350, "supplier_id": null, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 351, "supplier_id": null, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 352, "supplier_id": null, "product_name": "BEARING KOYO 6002", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 353, "supplier_id": null, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 354, "supplier_id": null, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 355, "supplier_id": null, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 356, "supplier_id": null, "product_name": "IGNITION COIL KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 357, "supplier_id": null, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 358, "supplier_id": null, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 359, "supplier_id": null, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 360, "supplier_id": null, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 361, "supplier_id": null, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 362, "supplier_id": null, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 363, "supplier_id": null, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 364, "supplier_id": null, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 365, "supplier_id": null, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 366, "supplier_id": null, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 367, "supplier_id": null, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 368, "supplier_id": null, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 369, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 370, "supplier_id": null, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 371, "supplier_id": null, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 372, "supplier_id": null, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 373, "supplier_id": null, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 374, "supplier_id": null, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 375, "supplier_id": null, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 377, "supplier_id": null, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 378, "supplier_id": null, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 379, "supplier_id": null, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 380, "supplier_id": null, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 381, "supplier_id": null, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 382, "supplier_id": null, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 383, "supplier_id": null, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 385, "supplier_id": null, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 386, "supplier_id": null, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 387, "supplier_id": null, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 388, "supplier_id": null, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 389, "supplier_id": null, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 390, "supplier_id": null, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 391, "supplier_id": null, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.5, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 392, "supplier_id": null, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 5.700000000000001, "stock_60d": 0.9000000000000021, "stock_90d": 0.0, "product_id": 393, "supplier_id": null, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 394, "supplier_id": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 395, "supplier_id": null, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 396, "supplier_id": null, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 397, "supplier_id": null, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 398, "supplier_id": null, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 399, "supplier_id": null, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 400, "supplier_id": null, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 401, "supplier_id": null, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 402, "supplier_id": null, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 403, "supplier_id": null, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 404, "supplier_id": null, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 405, "supplier_id": null, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 406, "supplier_id": null, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 407, "supplier_id": null, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 408, "supplier_id": null, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 409, "supplier_id": null, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 410, "supplier_id": null, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 411, "supplier_id": null, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 412, "supplier_id": null, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 413, "supplier_id": null, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 414, "supplier_id": null, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 415, "supplier_id": null, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 416, "supplier_id": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 417, "supplier_id": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 418, "supplier_id": null, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 1.6999999999999993, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 419, "supplier_id": null, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 5}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 420, "supplier_id": null, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 421, "supplier_id": null, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 422, "supplier_id": null, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 423, "supplier_id": null, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 424, "supplier_id": null, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 426, "supplier_id": null, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 427, "supplier_id": null, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 428, "supplier_id": null, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 3.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 322, "supplier_id": null, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.1000000000000005, "stock_60d": 2.700000000000001, "stock_90d": 0.3000000000000007, "product_id": 324, "supplier_id": null, "product_name": "A6300", "current_stock": 7, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 429, "supplier_id": null, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 430, "supplier_id": null, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 431, "supplier_id": null, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 432, "supplier_id": null, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 433, "supplier_id": null, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 434, "supplier_id": null, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 435, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 436, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 437, "supplier_id": null, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 438, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 439, "supplier_id": null, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 440, "supplier_id": null, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 441, "supplier_id": null, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 442, "supplier_id": null, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 444, "supplier_id": null, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 445, "supplier_id": null, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 446, "supplier_id": null, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 447, "supplier_id": null, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 448, "supplier_id": null, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 449, "supplier_id": null, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 2.5, "stock_90d": 0.0, "product_id": 450, "supplier_id": null, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 451, "supplier_id": null, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.1000000000000005, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 452, "supplier_id": null, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 453, "supplier_id": null, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 454, "supplier_id": null, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 455, "supplier_id": null, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.5, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 456, "supplier_id": null, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 7.300000000000001, "stock_60d": 4.1000000000000005, "stock_90d": 0.9000000000000004, "product_id": 457, "supplier_id": null, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 458, "supplier_id": null, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.9, "stock_60d": 7.300000000000001, "stock_90d": 5.7, "product_id": 459, "supplier_id": null, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 460, "supplier_id": null, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.7, "stock_60d": 8.9, "stock_90d": 8.1, "product_id": 461, "supplier_id": null, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 462, "supplier_id": null, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.100000000000001, "stock_60d": 5.700000000000001, "stock_90d": 3.3000000000000007, "product_id": 463, "supplier_id": null, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 464, "supplier_id": null, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.9, "stock_60d": 6.300000000000001, "stock_90d": 4.7, "product_id": 443, "supplier_id": null, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.7, "stock_60d": 6.9, "stock_90d": 6.1, "product_id": 323, "supplier_id": null, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 2.8999999999999995, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 301, "supplier_id": null, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 4}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 153, "supplier_id": null, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.7, "stock_60d": 6.9, "stock_90d": 6.1, "product_id": 425, "supplier_id": null, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 280, "supplier_id": null, "product_name": "AJVT GEAR OIL", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.1000000000000005, "stock_60d": 4.700000000000001, "stock_90d": 2.3000000000000007, "product_id": 306, "supplier_id": null, "product_name": "AKRX TUBE", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 4.5, "stock_60d": 0.5, "stock_90d": 0.0, "product_id": 296, "supplier_id": null, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 9.5, "stock_90d": 9.5, "product_id": 288, "supplier_id": null, "product_name": "AXLE EHE TMX", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.9, "stock_60d": 6.300000000000001, "stock_90d": 4.7, "product_id": 189, "supplier_id": null, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 4.5, "stock_60d": 4.5, "stock_90d": 4.5, "product_id": 272, "supplier_id": null, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "supplier_name": "Unassigned", "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 152, "supplier_id": null, "product_name": "AIR FILTER CLICK125", "current_stock": 0, "supplier_name": "Unassigned", "recommended_order": 11}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 384, "supplier_id": null, "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "supplier_name": "Unassigned", "recommended_order": 8}, {"urgency": "Medium", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 289, "supplier_id": null, "product_name": "ADD OIL PETRON", "current_stock": 3, "supplier_name": "Unassigned", "recommended_order": 9}]}, "generated_at": "2026-04-07T20:06:27.012585+00:00"}	rolling_average	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020	2026-04-08 05:06:27.012595
\.


--
-- Data for Name: analytics_model_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics_model_runs (run_id, model_key, model_engine, status, message, started_at, finished_at, duration_ms) FROM stdin;
1	overview	prophet	ok	Overview computed from cached forecasting blocks.	2026-04-03 15:04:09.383843	2026-04-03 15:04:09.451207	1562
2	forecast_30d	prophet	ok	Prophet model completed.	2026-04-03 15:04:27.386012	2026-04-03 15:04:27.442924	737
3	stock_prediction	fallback	ok	No product demand history yet.	2026-04-03 15:04:47.915654	2026-04-03 15:04:48.035243	161
4	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-03 23:56:47.78215	2026-04-03 23:56:47.78215	4524
5	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-03 23:56:47.78215	2026-04-03 23:56:47.78215	4524
6	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-03 23:56:47.78215	2026-04-03 23:56:47.78215	4524
7	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:00:35.618041	2026-04-04 00:00:35.618041	4446
8	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:00:35.618041	2026-04-04 00:00:35.618041	4446
9	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:00:35.618041	2026-04-04 00:00:35.618041	4446
10	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:03:41.241867	2026-04-04 00:03:41.241867	4525
11	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:03:41.241867	2026-04-04 00:03:41.241867	4525
12	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:03:41.241867	2026-04-04 00:03:41.241867	4525
13	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:05:13.112682	2026-04-04 00:05:13.112682	4587
14	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:05:13.112682	2026-04-04 00:05:13.112682	4587
15	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:05:13.112682	2026-04-04 00:05:13.112682	4587
16	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.060537	2026-04-04 00:26:24.060537	5125
17	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.060537	2026-04-04 00:26:24.060537	5125
18	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.060537	2026-04-04 00:26:24.060537	5125
19	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.440466	2026-04-04 00:26:24.440466	5068
20	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.440466	2026-04-04 00:26:24.440466	5068
21	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:26:24.440466	2026-04-04 00:26:24.440466	5068
22	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:48.902037	2026-04-04 00:33:48.902037	5093
23	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:48.902037	2026-04-04 00:33:48.902037	5093
24	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:48.902037	2026-04-04 00:33:48.902037	5093
25	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:49.141896	2026-04-04 00:33:49.141896	5102
26	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:49.141896	2026-04-04 00:33:49.141896	5102
27	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 00:33:49.141896	2026-04-04 00:33:49.141896	5102
28	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.799243	2026-04-04 01:03:35.799243	6621
29	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.799243	2026-04-04 01:03:35.799243	6621
30	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.799243	2026-04-04 01:03:35.799243	6621
31	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.627634	2026-04-04 01:03:35.627634	6784
32	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.627634	2026-04-04 01:03:35.627634	6784
33	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:03:35.627634	2026-04-04 01:03:35.627634	6784
34	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:31.027422	2026-04-04 01:07:31.027422	5786
35	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:31.027422	2026-04-04 01:07:31.027422	5786
36	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:31.027422	2026-04-04 01:07:31.027422	5786
37	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:30.986185	2026-04-04 01:07:30.986185	5848
38	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:30.986185	2026-04-04 01:07:30.986185	5848
39	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:07:30.986185	2026-04-04 01:07:30.986185	5848
40	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:46:54.565435	2026-04-04 01:46:54.565435	6647
41	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:46:54.565435	2026-04-04 01:46:54.565435	6647
42	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 01:46:54.565435	2026-04-04 01:46:54.565435	6647
43	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 02:40:47.222621	2026-04-04 02:40:47.222621	4961
44	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 02:40:47.222621	2026-04-04 02:40:47.222621	4961
45	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 02:40:47.222621	2026-04-04 02:40:47.222621	4961
46	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:21:24.26513	2026-04-04 06:21:24.26513	3785
47	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:21:24.26513	2026-04-04 06:21:24.26513	3785
48	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:21:24.26513	2026-04-04 06:21:24.26513	3785
49	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:25.398243	2026-04-04 06:25:25.398243	4958
50	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:25.398243	2026-04-04 06:25:25.398243	4958
51	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:25.398243	2026-04-04 06:25:25.398243	4958
52	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:26.202661	2026-04-04 06:25:26.202661	4994
53	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:26.202661	2026-04-04 06:25:26.202661	4994
54	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:25:26.202661	2026-04-04 06:25:26.202661	4994
55	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.163151	2026-04-04 06:28:10.163151	5309
56	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.163151	2026-04-04 06:28:10.163151	5309
57	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.163151	2026-04-04 06:28:10.163151	5309
58	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.439348	2026-04-04 06:28:10.439348	5373
59	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.439348	2026-04-04 06:28:10.439348	5373
60	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:28:10.439348	2026-04-04 06:28:10.439348	5373
61	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.198356	2026-04-04 06:33:53.198356	4973
62	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.198356	2026-04-04 06:33:53.198356	4973
63	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.198356	2026-04-04 06:33:53.198356	4973
64	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.287114	2026-04-04 06:33:53.287114	4937
65	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.287114	2026-04-04 06:33:53.287114	4937
66	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:33:53.287114	2026-04-04 06:33:53.287114	4937
67	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.175845	2026-04-04 06:34:48.175845	5643
68	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.175845	2026-04-04 06:34:48.175845	5643
69	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.175845	2026-04-04 06:34:48.175845	5643
70	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.21658	2026-04-04 06:34:48.21658	5515
71	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.21658	2026-04-04 06:34:48.21658	5515
72	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:34:48.21658	2026-04-04 06:34:48.21658	5515
73	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.753178	2026-04-04 06:37:46.753178	4179
74	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.753178	2026-04-04 06:37:46.753178	4179
75	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.753178	2026-04-04 06:37:46.753178	4179
76	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.849079	2026-04-04 06:37:46.849079	4120
77	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.849079	2026-04-04 06:37:46.849079	4120
78	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:37:46.849079	2026-04-04 06:37:46.849079	4120
79	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.322658	2026-04-04 06:38:04.322658	5105
80	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.322658	2026-04-04 06:38:04.322658	5105
81	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.322658	2026-04-04 06:38:04.322658	5105
82	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.502204	2026-04-04 06:38:04.502204	5232
83	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.502204	2026-04-04 06:38:04.502204	5232
84	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:38:04.502204	2026-04-04 06:38:04.502204	5232
85	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.438525	2026-04-04 06:58:23.438525	5425
86	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.438525	2026-04-04 06:58:23.438525	5425
87	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.438525	2026-04-04 06:58:23.438525	5425
88	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.435261	2026-04-04 06:58:23.435261	5457
89	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.435261	2026-04-04 06:58:23.435261	5457
90	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 06:58:23.435261	2026-04-04 06:58:23.435261	5457
91	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.568183	2026-04-04 07:14:03.568183	5045
92	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.568183	2026-04-04 07:14:03.568183	5045
93	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.568183	2026-04-04 07:14:03.568183	5045
94	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.621828	2026-04-04 07:14:03.621828	4946
95	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.621828	2026-04-04 07:14:03.621828	4946
96	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:14:03.621828	2026-04-04 07:14:03.621828	4946
97	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.422459	2026-04-04 07:16:12.422459	4884
98	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.422459	2026-04-04 07:16:12.422459	4884
99	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.422459	2026-04-04 07:16:12.422459	4884
100	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.559259	2026-04-04 07:16:12.559259	4866
101	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.559259	2026-04-04 07:16:12.559259	4866
102	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:12.559259	2026-04-04 07:16:12.559259	4866
103	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.300624	2026-04-04 07:16:52.300624	5438
104	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.300624	2026-04-04 07:16:52.300624	5438
105	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.300624	2026-04-04 07:16:52.300624	5438
106	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.478741	2026-04-04 07:16:52.478741	5402
107	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.478741	2026-04-04 07:16:52.478741	5402
108	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:16:52.478741	2026-04-04 07:16:52.478741	5402
109	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.895106	2026-04-04 07:21:19.895106	5710
110	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.895106	2026-04-04 07:21:19.895106	5710
111	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.895106	2026-04-04 07:21:19.895106	5710
112	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.885598	2026-04-04 07:21:19.885598	5743
113	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.885598	2026-04-04 07:21:19.885598	5743
114	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:21:19.885598	2026-04-04 07:21:19.885598	5743
115	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.100591	2026-04-04 07:39:30.100591	6252
116	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.100591	2026-04-04 07:39:30.100591	6252
117	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.100591	2026-04-04 07:39:30.100591	6252
118	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.083686	2026-04-04 07:39:30.083686	6282
119	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.083686	2026-04-04 07:39:30.083686	6282
120	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:30.083686	2026-04-04 07:39:30.083686	6282
121	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.779187	2026-04-04 07:39:56.779187	5114
122	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.779187	2026-04-04 07:39:56.779187	5114
123	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.779187	2026-04-04 07:39:56.779187	5114
124	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.863195	2026-04-04 07:39:56.863195	5100
125	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.863195	2026-04-04 07:39:56.863195	5100
126	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:39:56.863195	2026-04-04 07:39:56.863195	5100
127	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.62108	2026-04-04 07:40:59.62108	5433
128	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.62108	2026-04-04 07:40:59.62108	5433
129	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.62108	2026-04-04 07:40:59.62108	5433
130	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.643484	2026-04-04 07:40:59.643484	5459
131	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.643484	2026-04-04 07:40:59.643484	5459
132	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:40:59.643484	2026-04-04 07:40:59.643484	5459
133	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.587527	2026-04-04 07:59:55.587527	6769
134	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.587527	2026-04-04 07:59:55.587527	6769
135	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.587527	2026-04-04 07:59:55.587527	6769
136	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.774871	2026-04-04 07:59:55.774871	6638
137	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.774871	2026-04-04 07:59:55.774871	6638
138	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 07:59:55.774871	2026-04-04 07:59:55.774871	6638
139	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.206016	2026-04-04 08:00:33.206016	4779
140	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.206016	2026-04-04 08:00:33.206016	4779
141	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.206016	2026-04-04 08:00:33.206016	4779
142	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.353141	2026-04-04 08:00:33.353141	4656
143	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.353141	2026-04-04 08:00:33.353141	4656
144	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:00:33.353141	2026-04-04 08:00:33.353141	4656
145	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:11.99151	2026-04-04 08:01:11.99151	5145
146	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:11.99151	2026-04-04 08:01:11.99151	5145
147	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:11.99151	2026-04-04 08:01:11.99151	5145
148	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:12.477159	2026-04-04 08:01:12.477159	5335
149	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:12.477159	2026-04-04 08:01:12.477159	5335
150	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:12.477159	2026-04-04 08:01:12.477159	5335
151	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.24601	2026-04-04 08:01:32.24601	2132
152	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.24601	2026-04-04 08:01:32.24601	2132
153	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.24601	2026-04-04 08:01:32.24601	2132
154	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.215186	2026-04-04 08:01:32.215186	2192
155	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.215186	2026-04-04 08:01:32.215186	2192
156	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:32.215186	2026-04-04 08:01:32.215186	2192
157	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.15505	2026-04-04 08:01:56.15505	5472
158	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.15505	2026-04-04 08:01:56.15505	5472
159	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.15505	2026-04-04 08:01:56.15505	5472
160	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.184745	2026-04-04 08:01:56.184745	5654
161	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.184745	2026-04-04 08:01:56.184745	5654
162	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:01:56.184745	2026-04-04 08:01:56.184745	5654
163	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.815443	2026-04-04 08:03:01.815443	6181
164	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.815443	2026-04-04 08:03:01.815443	6181
165	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.815443	2026-04-04 08:03:01.815443	6181
166	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.790054	2026-04-04 08:03:01.790054	6339
167	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.790054	2026-04-04 08:03:01.790054	6339
168	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:03:01.790054	2026-04-04 08:03:01.790054	6339
169	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.341973	2026-04-04 08:06:11.341973	5921
170	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.341973	2026-04-04 08:06:11.341973	5921
171	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.341973	2026-04-04 08:06:11.341973	5921
172	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.778906	2026-04-04 08:06:11.778906	6181
173	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.778906	2026-04-04 08:06:11.778906	6181
174	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:11.778906	2026-04-04 08:06:11.778906	6181
175	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.632371	2026-04-04 08:06:49.632371	5286
176	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.632371	2026-04-04 08:06:49.632371	5286
177	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.632371	2026-04-04 08:06:49.632371	5286
178	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.727159	2026-04-04 08:06:49.727159	5206
179	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.727159	2026-04-04 08:06:49.727159	5206
180	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:06:49.727159	2026-04-04 08:06:49.727159	5206
181	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:08:00.180432	2026-04-04 08:08:00.180432	15751
182	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:08:00.180432	2026-04-04 08:08:00.180432	15751
183	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:08:00.180432	2026-04-04 08:08:00.180432	15751
184	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.332311	2026-04-04 08:16:58.332311	5811
185	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.332311	2026-04-04 08:16:58.332311	5811
186	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.332311	2026-04-04 08:16:58.332311	5811
187	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.362036	2026-04-04 08:16:58.362036	5824
188	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.362036	2026-04-04 08:16:58.362036	5824
189	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:16:58.362036	2026-04-04 08:16:58.362036	5824
190	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.208677	2026-04-04 08:17:23.208677	5433
191	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.208677	2026-04-04 08:17:23.208677	5433
192	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.208677	2026-04-04 08:17:23.208677	5433
193	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.245321	2026-04-04 08:17:23.245321	5409
194	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.245321	2026-04-04 08:17:23.245321	5409
195	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:23.245321	2026-04-04 08:17:23.245321	5409
196	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:43.950393	2026-04-04 08:17:43.950393	4991
197	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:43.950393	2026-04-04 08:17:43.950393	4991
198	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:17:43.950393	2026-04-04 08:17:43.950393	4991
199	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.349562	2026-04-04 08:18:09.349562	7091
200	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.349562	2026-04-04 08:18:09.349562	7091
201	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.349562	2026-04-04 08:18:09.349562	7091
202	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.304486	2026-04-04 08:18:09.304486	7205
203	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.304486	2026-04-04 08:18:09.304486	7205
204	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:09.304486	2026-04-04 08:18:09.304486	7205
205	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.948502	2026-04-04 08:18:45.948502	5432
206	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.948502	2026-04-04 08:18:45.948502	5432
207	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.948502	2026-04-04 08:18:45.948502	5432
208	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.901413	2026-04-04 08:18:45.901413	5499
209	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.901413	2026-04-04 08:18:45.901413	5499
210	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:18:45.901413	2026-04-04 08:18:45.901413	5499
211	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.415146	2026-04-04 08:19:09.415146	5761
212	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.415146	2026-04-04 08:19:09.415146	5761
213	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.415146	2026-04-04 08:19:09.415146	5761
214	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.537019	2026-04-04 08:19:09.537019	5650
215	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.537019	2026-04-04 08:19:09.537019	5650
216	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:19:09.537019	2026-04-04 08:19:09.537019	5650
217	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.890066	2026-04-04 08:20:04.890066	5687
218	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.890066	2026-04-04 08:20:04.890066	5687
219	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.890066	2026-04-04 08:20:04.890066	5687
220	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.819813	2026-04-04 08:20:04.819813	5658
221	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.819813	2026-04-04 08:20:04.819813	5658
222	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:20:04.819813	2026-04-04 08:20:04.819813	5658
223	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:18.920828	2026-04-04 08:26:18.920828	5951
224	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:18.920828	2026-04-04 08:26:18.920828	5951
225	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:18.920828	2026-04-04 08:26:18.920828	5951
226	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.296815	2026-04-04 08:26:58.296815	3017
227	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.296815	2026-04-04 08:26:58.296815	3017
228	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.296815	2026-04-04 08:26:58.296815	3017
229	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.474	2026-04-04 08:26:58.474	2869
230	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.474	2026-04-04 08:26:58.474	2869
231	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:26:58.474	2026-04-04 08:26:58.474	2869
232	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.706269	2026-04-04 08:27:14.706269	6318
233	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.706269	2026-04-04 08:27:14.706269	6318
234	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.706269	2026-04-04 08:27:14.706269	6318
235	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.939215	2026-04-04 08:27:14.939215	6337
236	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.939215	2026-04-04 08:27:14.939215	6337
237	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:14.939215	2026-04-04 08:27:14.939215	6337
238	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.511207	2026-04-04 08:27:40.511207	6658
239	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.511207	2026-04-04 08:27:40.511207	6658
240	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.511207	2026-04-04 08:27:40.511207	6658
241	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.558044	2026-04-04 08:27:40.558044	6638
242	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.558044	2026-04-04 08:27:40.558044	6638
243	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:27:40.558044	2026-04-04 08:27:40.558044	6638
244	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:21.92919	2026-04-04 08:28:21.92919	5844
245	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:21.92919	2026-04-04 08:28:21.92919	5844
246	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:21.92919	2026-04-04 08:28:21.92919	5844
247	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:22.047078	2026-04-04 08:28:22.047078	5750
248	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:22.047078	2026-04-04 08:28:22.047078	5750
249	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:22.047078	2026-04-04 08:28:22.047078	5750
250	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.772079	2026-04-04 08:28:57.772079	2072
251	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.772079	2026-04-04 08:28:57.772079	2072
252	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.772079	2026-04-04 08:28:57.772079	2072
253	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.742067	2026-04-04 08:28:57.742067	2171
254	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.742067	2026-04-04 08:28:57.742067	2171
255	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:28:57.742067	2026-04-04 08:28:57.742067	2171
256	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.288455	2026-04-04 08:29:32.288455	1848
257	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.288455	2026-04-04 08:29:32.288455	1848
258	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.288455	2026-04-04 08:29:32.288455	1848
259	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.252733	2026-04-04 08:29:32.252733	1878
260	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.252733	2026-04-04 08:29:32.252733	1878
261	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 08:29:32.252733	2026-04-04 08:29:32.252733	1878
262	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:31:01.144557	2026-04-04 22:31:01.144557	8165
263	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:31:01.144557	2026-04-04 22:31:01.144557	8165
264	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:31:01.144557	2026-04-04 22:31:01.144557	8165
265	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:33:16.103652	2026-04-04 22:33:16.103652	5062
266	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:33:16.103652	2026-04-04 22:33:16.103652	5062
267	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:33:16.103652	2026-04-04 22:33:16.103652	5062
268	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:37:48.734533	2026-04-04 22:37:48.734533	3530
269	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:37:48.734533	2026-04-04 22:37:48.734533	3530
270	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:37:48.734533	2026-04-04 22:37:48.734533	3530
271	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:38:06.907406	2026-04-04 22:38:06.907406	4232
272	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:38:06.907406	2026-04-04 22:38:06.907406	4232
273	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:38:06.907406	2026-04-04 22:38:06.907406	4232
274	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:17.167162	2026-04-04 22:39:17.167162	3844
275	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:17.167162	2026-04-04 22:39:17.167162	3844
276	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:17.167162	2026-04-04 22:39:17.167162	3844
277	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:58.450123	2026-04-04 22:39:58.450123	6439
278	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:58.450123	2026-04-04 22:39:58.450123	6439
279	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:39:58.450123	2026-04-04 22:39:58.450123	6439
280	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:40:20.976887	2026-04-04 22:40:20.976887	4196
281	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:40:20.976887	2026-04-04 22:40:20.976887	4196
282	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:40:20.976887	2026-04-04 22:40:20.976887	4196
283	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:41:01.99304	2026-04-04 22:41:01.99304	4019
284	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:41:01.99304	2026-04-04 22:41:01.99304	4019
285	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:41:01.99304	2026-04-04 22:41:01.99304	4019
286	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:43:25.084869	2026-04-04 22:43:25.084869	3788
287	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:43:25.084869	2026-04-04 22:43:25.084869	3788
288	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:43:25.084869	2026-04-04 22:43:25.084869	3788
289	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:44:03.276213	2026-04-04 22:44:03.276213	3767
290	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:44:03.276213	2026-04-04 22:44:03.276213	3767
291	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:44:03.276213	2026-04-04 22:44:03.276213	3767
292	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:21.849215	2026-04-04 22:45:21.849215	3026
293	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:21.849215	2026-04-04 22:45:21.849215	3026
294	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:21.849215	2026-04-04 22:45:21.849215	3026
295	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:39.500447	2026-04-04 22:45:39.500447	3946
296	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:39.500447	2026-04-04 22:45:39.500447	3946
297	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:45:39.500447	2026-04-04 22:45:39.500447	3946
298	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:46:42.497116	2026-04-04 22:46:42.497116	3855
299	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:46:42.497116	2026-04-04 22:46:42.497116	3855
300	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 22:46:42.497116	2026-04-04 22:46:42.497116	3855
301	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:06:51.727447	2026-04-04 23:06:51.727447	7037
302	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:06:51.727447	2026-04-04 23:06:51.727447	7037
303	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:06:51.727447	2026-04-04 23:06:51.727447	7037
304	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:16.812507	2026-04-04 23:45:16.812507	4482
305	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:16.812507	2026-04-04 23:45:16.812507	4482
306	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:16.812507	2026-04-04 23:45:16.812507	4482
307	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:59.258859	2026-04-04 23:45:59.258859	3940
308	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:59.258859	2026-04-04 23:45:59.258859	3940
309	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:45:59.258859	2026-04-04 23:45:59.258859	3940
310	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:46:55.687889	2026-04-04 23:46:55.687889	3517
311	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:46:55.687889	2026-04-04 23:46:55.687889	3517
312	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:46:55.687889	2026-04-04 23:46:55.687889	3517
313	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:48:23.921753	2026-04-04 23:48:23.921753	4182
314	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:48:23.921753	2026-04-04 23:48:23.921753	4182
315	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:48:23.921753	2026-04-04 23:48:23.921753	4182
316	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:50:07.796745	2026-04-04 23:50:07.796745	3958
317	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:50:07.796745	2026-04-04 23:50:07.796745	3958
318	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:50:07.796745	2026-04-04 23:50:07.796745	3958
319	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:53:53.443471	2026-04-04 23:53:53.443471	6324
320	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:53:53.443471	2026-04-04 23:53:53.443471	6324
321	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:53:53.443471	2026-04-04 23:53:53.443471	6324
322	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:58:36.147936	2026-04-04 23:58:36.147936	18167
323	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:58:36.147936	2026-04-04 23:58:36.147936	18167
324	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-04 23:58:36.147936	2026-04-04 23:58:36.147936	18167
325	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:08:58.432448	2026-04-05 00:08:58.432448	10767
326	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:08:58.432448	2026-04-05 00:08:58.432448	10767
327	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:08:58.432448	2026-04-05 00:08:58.432448	10767
328	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:11:49.675612	2026-04-05 00:11:49.675612	6334
329	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:11:49.675612	2026-04-05 00:11:49.675612	6334
330	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:11:49.675612	2026-04-05 00:11:49.675612	6334
331	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:18:51.898068	2026-04-05 00:18:51.898068	4437
332	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:18:51.898068	2026-04-05 00:18:51.898068	4437
333	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 00:18:51.898068	2026-04-05 00:18:51.898068	4437
334	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:18:56.345119	2026-04-05 01:18:56.345119	3374
335	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:18:56.345119	2026-04-05 01:18:56.345119	3374
336	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:18:56.345119	2026-04-05 01:18:56.345119	3374
337	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:21:31.757785	2026-04-05 01:21:31.757785	7774
338	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:21:31.757785	2026-04-05 01:21:31.757785	7774
339	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:21:31.757785	2026-04-05 01:21:31.757785	7774
340	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:31:54.229857	2026-04-05 01:31:54.229857	5442
341	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:31:54.229857	2026-04-05 01:31:54.229857	5442
342	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:31:54.229857	2026-04-05 01:31:54.229857	5442
343	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:52:06.714485	2026-04-05 01:52:06.714485	4306
344	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:52:06.714485	2026-04-05 01:52:06.714485	4306
345	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 01:52:06.714485	2026-04-05 01:52:06.714485	4306
346	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:05:50.616634	2026-04-05 02:05:50.616634	4341
347	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:05:50.616634	2026-04-05 02:05:50.616634	4341
348	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:05:50.616634	2026-04-05 02:05:50.616634	4341
349	overview	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:39.666977	2026-04-05 02:06:39.666977	2727
350	forecast_30d	rolling_mean	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:39.666977	2026-04-05 02:06:39.666977	2727
351	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:39.666977	2026-04-05 02:06:39.666977	2727
352	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:55.630368	2026-04-05 02:06:55.630368	3984
353	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:55.630368	2026-04-05 02:06:55.630368	3984
354	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:06:55.630368	2026-04-05 02:06:55.630368	3984
355	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:09:48.555492	2026-04-05 02:09:48.555492	4129
356	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:09:48.555492	2026-04-05 02:09:48.555492	4129
357	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:09:48.555492	2026-04-05 02:09:48.555492	4129
358	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:26:22.121531	2026-04-05 02:26:22.121531	4419
359	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:26:22.121531	2026-04-05 02:26:22.121531	4419
360	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:26:22.121531	2026-04-05 02:26:22.121531	4419
361	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.483568	2026-04-05 02:34:56.483568	5298
362	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.483568	2026-04-05 02:34:56.483568	5298
363	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.483568	2026-04-05 02:34:56.483568	5298
364	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.633269	2026-04-05 02:34:56.633269	5251
365	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.633269	2026-04-05 02:34:56.633269	5251
366	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:34:56.633269	2026-04-05 02:34:56.633269	5251
367	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.649663	2026-04-05 02:35:31.649663	5822
368	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.649663	2026-04-05 02:35:31.649663	5822
369	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.649663	2026-04-05 02:35:31.649663	5822
370	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.768878	2026-04-05 02:35:31.768878	5788
371	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.768878	2026-04-05 02:35:31.768878	5788
372	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:35:31.768878	2026-04-05 02:35:31.768878	5788
373	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.617361	2026-04-05 02:39:36.617361	7746
374	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.617361	2026-04-05 02:39:36.617361	7746
375	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.617361	2026-04-05 02:39:36.617361	7746
376	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.796486	2026-04-05 02:39:36.796486	7619
377	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.796486	2026-04-05 02:39:36.796486	7619
378	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:39:36.796486	2026-04-05 02:39:36.796486	7619
379	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.159227	2026-04-05 02:41:00.159227	6665
380	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.159227	2026-04-05 02:41:00.159227	6665
381	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.159227	2026-04-05 02:41:00.159227	6665
382	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.492289	2026-04-05 02:41:00.492289	6671
383	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.492289	2026-04-05 02:41:00.492289	6671
384	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:41:00.492289	2026-04-05 02:41:00.492289	6671
385	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.136679	2026-04-05 02:47:20.136679	5511
386	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.136679	2026-04-05 02:47:20.136679	5511
387	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.136679	2026-04-05 02:47:20.136679	5511
388	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.330424	2026-04-05 02:47:20.330424	5565
389	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.330424	2026-04-05 02:47:20.330424	5565
390	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:47:20.330424	2026-04-05 02:47:20.330424	5565
391	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.690911	2026-04-05 02:51:27.690911	6623
392	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.690911	2026-04-05 02:51:27.690911	6623
393	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.690911	2026-04-05 02:51:27.690911	6623
394	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.80898	2026-04-05 02:51:27.80898	6558
395	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.80898	2026-04-05 02:51:27.80898	6558
396	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 02:51:27.80898	2026-04-05 02:51:27.80898	6558
397	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.103622	2026-04-05 03:15:36.103622	5903
398	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.103622	2026-04-05 03:15:36.103622	5903
399	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.103622	2026-04-05 03:15:36.103622	5903
400	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.441442	2026-04-05 03:15:36.441442	5776
401	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.441442	2026-04-05 03:15:36.441442	5776
402	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:15:36.441442	2026-04-05 03:15:36.441442	5776
403	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.280811	2026-04-05 03:16:14.280811	6196
404	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.280811	2026-04-05 03:16:14.280811	6196
405	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.280811	2026-04-05 03:16:14.280811	6196
406	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.133977	2026-04-05 03:16:14.133977	6460
407	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.133977	2026-04-05 03:16:14.133977	6460
408	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:16:14.133977	2026-04-05 03:16:14.133977	6460
409	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:24:22.89576	2026-04-05 03:24:22.89576	7520
410	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:24:22.89576	2026-04-05 03:24:22.89576	7520
411	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:24:22.89576	2026-04-05 03:24:22.89576	7520
412	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:31:28.494282	2026-04-05 03:31:28.494282	5987
413	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:31:28.494282	2026-04-05 03:31:28.494282	5987
414	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:31:28.494282	2026-04-05 03:31:28.494282	5987
415	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:32:13.746544	2026-04-05 03:32:13.746544	3477
416	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:32:13.746544	2026-04-05 03:32:13.746544	3477
417	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:32:13.746544	2026-04-05 03:32:13.746544	3477
418	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:34:38.647382	2026-04-05 03:34:38.647382	3019
419	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:34:38.647382	2026-04-05 03:34:38.647382	3019
420	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:34:38.647382	2026-04-05 03:34:38.647382	3019
421	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:09.930265	2026-04-05 03:35:09.930265	2972
422	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:09.930265	2026-04-05 03:35:09.930265	2972
423	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:09.930265	2026-04-05 03:35:09.930265	2972
424	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:26.729372	2026-04-05 03:35:26.729372	2937
425	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:26.729372	2026-04-05 03:35:26.729372	2937
426	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:26.729372	2026-04-05 03:35:26.729372	2937
427	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:43.572368	2026-04-05 03:35:43.572368	3991
428	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:43.572368	2026-04-05 03:35:43.572368	3991
429	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:35:43.572368	2026-04-05 03:35:43.572368	3991
430	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:50:34.878729	2026-04-05 03:50:34.878729	3068
431	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:50:34.878729	2026-04-05 03:50:34.878729	3068
432	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:50:34.878729	2026-04-05 03:50:34.878729	3068
433	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:56:23.664565	2026-04-05 03:56:23.664565	3668
434	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:56:23.664565	2026-04-05 03:56:23.664565	3668
435	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 03:56:23.664565	2026-04-05 03:56:23.664565	3668
436	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 04:56:25.317418	2026-04-05 04:56:25.317418	1954
437	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 04:56:25.317418	2026-04-05 04:56:25.317418	1954
438	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 04:56:25.317418	2026-04-05 04:56:25.317418	1954
439	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 05:59:02.72834	2026-04-05 05:59:02.72834	2041
440	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 05:59:02.72834	2026-04-05 05:59:02.72834	2041
441	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 05:59:02.72834	2026-04-05 05:59:02.72834	2041
442	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:01:38.779174	2026-04-05 21:01:38.779174	7022
443	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:01:38.779174	2026-04-05 21:01:38.779174	7022
444	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:01:38.779174	2026-04-05 21:01:38.779174	7022
445	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:27.244175	2026-04-05 21:16:27.244175	3155
446	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:27.244175	2026-04-05 21:16:27.244175	3155
447	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:27.244175	2026-04-05 21:16:27.244175	3155
448	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:53.150523	2026-04-05 21:16:53.150523	2837
449	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:53.150523	2026-04-05 21:16:53.150523	2837
450	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:16:53.150523	2026-04-05 21:16:53.150523	2837
451	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:32:37.802889	2026-04-05 21:32:37.802889	9235
452	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:32:37.802889	2026-04-05 21:32:37.802889	9235
453	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:32:37.802889	2026-04-05 21:32:37.802889	9235
454	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:18.624408	2026-04-05 21:34:18.624408	2870
455	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:18.624408	2026-04-05 21:34:18.624408	2870
456	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:18.624408	2026-04-05 21:34:18.624408	2870
457	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:40.322805	2026-04-05 21:34:40.322805	3762
458	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:40.322805	2026-04-05 21:34:40.322805	3762
459	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:34:40.322805	2026-04-05 21:34:40.322805	3762
460	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:36:05.143315	2026-04-05 21:36:05.143315	2803
461	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:36:05.143315	2026-04-05 21:36:05.143315	2803
462	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 21:36:05.143315	2026-04-05 21:36:05.143315	2803
463	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:01:29.908427	2026-04-05 22:01:29.908427	3312
464	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:01:29.908427	2026-04-05 22:01:29.908427	3312
465	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:01:29.908427	2026-04-05 22:01:29.908427	3312
466	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:09:07.695367	2026-04-05 22:09:07.695367	3306
467	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:09:07.695367	2026-04-05 22:09:07.695367	3306
468	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:09:07.695367	2026-04-05 22:09:07.695367	3306
469	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:10:33.968555	2026-04-05 22:10:33.968555	3134
470	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:10:33.968555	2026-04-05 22:10:33.968555	3134
471	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:10:33.968555	2026-04-05 22:10:33.968555	3134
472	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:00.673488	2026-04-05 22:11:00.673488	3756
473	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:00.673488	2026-04-05 22:11:00.673488	3756
474	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:00.673488	2026-04-05 22:11:00.673488	3756
475	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:55.605958	2026-04-05 22:11:55.605958	3767
476	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:55.605958	2026-04-05 22:11:55.605958	3767
477	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:11:55.605958	2026-04-05 22:11:55.605958	3767
478	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:20:59.220266	2026-04-05 22:20:59.220266	3614
479	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:20:59.220266	2026-04-05 22:20:59.220266	3614
480	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:20:59.220266	2026-04-05 22:20:59.220266	3614
481	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:18.736693	2026-04-05 22:21:18.736693	4317
482	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:18.736693	2026-04-05 22:21:18.736693	4317
483	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:18.736693	2026-04-05 22:21:18.736693	4317
484	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:40.537633	2026-04-05 22:21:40.537633	3551
485	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:40.537633	2026-04-05 22:21:40.537633	3551
486	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:21:40.537633	2026-04-05 22:21:40.537633	3551
487	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:01.332636	2026-04-05 22:22:01.332636	4157
488	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:01.332636	2026-04-05 22:22:01.332636	4157
489	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:01.332636	2026-04-05 22:22:01.332636	4157
490	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:16.103188	2026-04-05 22:22:16.103188	3836
491	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:16.103188	2026-04-05 22:22:16.103188	3836
492	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:22:16.103188	2026-04-05 22:22:16.103188	3836
493	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:23:59.69583	2026-04-05 22:23:59.69583	3772
494	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:23:59.69583	2026-04-05 22:23:59.69583	3772
495	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:23:59.69583	2026-04-05 22:23:59.69583	3772
496	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:26:45.254847	2026-04-05 22:26:45.254847	2811
497	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:26:45.254847	2026-04-05 22:26:45.254847	2811
498	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:26:45.254847	2026-04-05 22:26:45.254847	2811
499	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:39:06.148402	2026-04-05 22:39:06.148402	7632
500	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:39:06.148402	2026-04-05 22:39:06.148402	7632
501	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:39:06.148402	2026-04-05 22:39:06.148402	7632
502	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:45:08.736282	2026-04-05 22:45:08.736282	3717
503	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:45:08.736282	2026-04-05 22:45:08.736282	3717
504	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:45:08.736282	2026-04-05 22:45:08.736282	3717
505	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:46:30.510123	2026-04-05 22:46:30.510123	10870
506	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:46:30.510123	2026-04-05 22:46:30.510123	10870
507	stock_prediction	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:46:30.510123	2026-04-05 22:46:30.510123	10870
508	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:47:04.493018	2026-04-05 22:47:04.493018	13964
509	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:47:04.493018	2026-04-05 22:47:04.493018	13964
510	stock_prediction	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:47:04.493018	2026-04-05 22:47:04.493018	13964
511	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:49:37.164558	2026-04-05 22:49:37.164558	3691
512	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:49:37.164558	2026-04-05 22:49:37.164558	3691
513	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 22:49:37.164558	2026-04-05 22:49:37.164558	3691
514	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:00:25.180626	2026-04-05 23:00:25.180626	3737
515	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:00:25.180626	2026-04-05 23:00:25.180626	3737
516	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:00:25.180626	2026-04-05 23:00:25.180626	3737
517	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:25:48.850197	2026-04-05 23:25:48.850197	3735
518	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:25:48.850197	2026-04-05 23:25:48.850197	3735
519	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:25:48.850197	2026-04-05 23:25:48.850197	3735
520	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:26:54.573308	2026-04-05 23:26:54.573308	3550
521	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:26:54.573308	2026-04-05 23:26:54.573308	3550
522	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:26:54.573308	2026-04-05 23:26:54.573308	3550
523	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:46:18.898792	2026-04-05 23:46:18.898792	4033
524	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:46:18.898792	2026-04-05 23:46:18.898792	4033
525	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:46:18.898792	2026-04-05 23:46:18.898792	4033
526	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:57:11.083417	2026-04-05 23:57:11.083417	4734
527	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:57:11.083417	2026-04-05 23:57:11.083417	4734
528	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-05 23:57:11.083417	2026-04-05 23:57:11.083417	4734
529	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:01:31.594344	2026-04-06 00:01:31.594344	4366
530	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:01:31.594344	2026-04-06 00:01:31.594344	4366
531	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:01:31.594344	2026-04-06 00:01:31.594344	4366
532	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:02:13.680327	2026-04-06 00:02:13.680327	2976
533	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:02:13.680327	2026-04-06 00:02:13.680327	2976
534	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:02:13.680327	2026-04-06 00:02:13.680327	2976
535	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:03:12.60591	2026-04-06 00:03:12.60591	3086
536	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:03:12.60591	2026-04-06 00:03:12.60591	3086
537	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:03:12.60591	2026-04-06 00:03:12.60591	3086
538	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:04:07.991284	2026-04-06 00:04:07.991284	1825
539	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:04:07.991284	2026-04-06 00:04:07.991284	1825
540	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:04:07.991284	2026-04-06 00:04:07.991284	1825
541	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:14:09.138848	2026-04-06 00:14:09.138848	1430
542	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:14:09.138848	2026-04-06 00:14:09.138848	1430
543	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:14:09.138848	2026-04-06 00:14:09.138848	1430
544	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:21:01.82715	2026-04-06 00:21:01.82715	1464
545	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:21:01.82715	2026-04-06 00:21:01.82715	1464
546	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 00:21:01.82715	2026-04-06 00:21:01.82715	1464
547	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:08:31.889283	2026-04-06 01:08:31.889283	1519
548	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:08:31.889283	2026-04-06 01:08:31.889283	1519
549	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:08:31.889283	2026-04-06 01:08:31.889283	1519
550	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:29:54.424878	2026-04-06 01:29:54.424878	1415
551	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:29:54.424878	2026-04-06 01:29:54.424878	1415
552	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:29:54.424878	2026-04-06 01:29:54.424878	1415
553	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:31:55.38714	2026-04-06 01:31:55.38714	1436
554	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:31:55.38714	2026-04-06 01:31:55.38714	1436
555	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:31:55.38714	2026-04-06 01:31:55.38714	1436
556	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:32:18.354308	2026-04-06 01:32:18.354308	1477
557	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:32:18.354308	2026-04-06 01:32:18.354308	1477
558	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:32:18.354308	2026-04-06 01:32:18.354308	1477
559	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:51:21.950984	2026-04-06 01:51:21.950984	4106
560	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:51:21.950984	2026-04-06 01:51:21.950984	4106
561	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:51:21.950984	2026-04-06 01:51:21.950984	4106
562	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:54:48.057272	2026-04-06 01:54:48.057272	4010
563	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:54:48.057272	2026-04-06 01:54:48.057272	4010
564	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:54:48.057272	2026-04-06 01:54:48.057272	4010
565	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:57:11.951203	2026-04-06 01:57:11.951203	4182
566	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:57:11.951203	2026-04-06 01:57:11.951203	4182
567	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 01:57:11.951203	2026-04-06 01:57:11.951203	4182
568	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:21:58.195245	2026-04-06 02:21:58.195245	4415
569	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:21:58.195245	2026-04-06 02:21:58.195245	4415
570	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:21:58.195245	2026-04-06 02:21:58.195245	4415
571	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:23.527724	2026-04-06 02:23:23.527724	4050
572	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:23.527724	2026-04-06 02:23:23.527724	4050
573	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:23.527724	2026-04-06 02:23:23.527724	4050
574	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:58.742593	2026-04-06 02:23:58.742593	4408
575	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:58.742593	2026-04-06 02:23:58.742593	4408
576	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:23:58.742593	2026-04-06 02:23:58.742593	4408
577	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:28.28216	2026-04-06 02:24:28.28216	4208
578	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:28.28216	2026-04-06 02:24:28.28216	4208
579	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:28.28216	2026-04-06 02:24:28.28216	4208
580	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:51.255121	2026-04-06 02:24:51.255121	4115
581	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:51.255121	2026-04-06 02:24:51.255121	4115
582	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 02:24:51.255121	2026-04-06 02:24:51.255121	4115
583	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:41:14.34778	2026-04-06 05:41:14.34778	8700
584	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:41:14.34778	2026-04-06 05:41:14.34778	8700
585	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:41:14.34778	2026-04-06 05:41:14.34778	8700
586	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:55:05.489454	2026-04-06 05:55:05.489454	3652
587	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:55:05.489454	2026-04-06 05:55:05.489454	3652
588	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 05:55:05.489454	2026-04-06 05:55:05.489454	3652
589	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 11:50:26.33116	2026-04-06 11:50:26.33116	4955
590	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 11:50:26.33116	2026-04-06 11:50:26.33116	4955
591	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 11:50:26.33116	2026-04-06 11:50:26.33116	4955
592	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 13:02:58.933212	2026-04-06 13:02:58.933212	2916
593	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 13:02:58.933212	2026-04-06 13:02:58.933212	2916
594	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 13:02:58.933212	2026-04-06 13:02:58.933212	2916
604	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:16:16.400415	2026-04-06 23:16:16.400415	1773
605	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:16:16.400415	2026-04-06 23:16:16.400415	1773
606	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:16:16.400415	2026-04-06 23:16:16.400415	1773
616	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:59:18.860292	2026-04-06 23:59:18.860292	1323
617	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:59:18.860292	2026-04-06 23:59:18.860292	1323
618	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:59:18.860292	2026-04-06 23:59:18.860292	1323
628	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:08:28.6748	2026-04-07 00:08:28.6748	1783
629	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:08:28.6748	2026-04-07 00:08:28.6748	1783
630	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:08:28.6748	2026-04-07 00:08:28.6748	1783
640	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:32:29.642126	2026-04-07 00:32:29.642126	1511
641	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:32:29.642126	2026-04-07 00:32:29.642126	1511
642	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:32:29.642126	2026-04-07 00:32:29.642126	1511
652	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:47:40.295959	2026-04-07 00:47:40.295959	1835
653	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:47:40.295959	2026-04-07 00:47:40.295959	1835
654	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:47:40.295959	2026-04-07 00:47:40.295959	1835
664	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:29:59.620116	2026-04-07 01:29:59.620116	1389
665	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:29:59.620116	2026-04-07 01:29:59.620116	1389
666	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:29:59.620116	2026-04-07 01:29:59.620116	1389
676	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:37:10.451848	2026-04-07 01:37:10.451848	1830
677	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:37:10.451848	2026-04-07 01:37:10.451848	1830
678	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:37:10.451848	2026-04-07 01:37:10.451848	1830
688	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:25:35.041749	2026-04-07 02:25:35.041749	1841
689	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:25:35.041749	2026-04-07 02:25:35.041749	1841
690	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:25:35.041749	2026-04-07 02:25:35.041749	1841
700	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:43.099995	2026-04-07 02:27:43.099995	1953
701	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:43.099995	2026-04-07 02:27:43.099995	1953
702	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:43.099995	2026-04-07 02:27:43.099995	1953
712	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:38:01.464745	2026-04-07 02:38:01.464745	1946
713	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:38:01.464745	2026-04-07 02:38:01.464745	1946
714	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:38:01.464745	2026-04-07 02:38:01.464745	1946
724	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:49.320029	2026-04-07 11:07:49.320029	1759
725	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:49.320029	2026-04-07 11:07:49.320029	1759
726	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:49.320029	2026-04-07 11:07:49.320029	1759
736	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:31:08.872429	2026-04-07 11:31:08.872429	1475
737	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:31:08.872429	2026-04-07 11:31:08.872429	1475
738	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:31:08.872429	2026-04-07 11:31:08.872429	1475
748	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:42:25.629837	2026-04-07 11:42:25.629837	1508
749	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:42:25.629837	2026-04-07 11:42:25.629837	1508
750	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:42:25.629837	2026-04-07 11:42:25.629837	1508
760	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:40:22.291444	2026-04-08 03:40:22.291444	5176
761	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:40:22.291444	2026-04-08 03:40:22.291444	5176
762	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:40:22.291444	2026-04-08 03:40:22.291444	5176
595	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 15:58:20.170819	2026-04-06 15:58:20.170819	3270
596	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 15:58:20.170819	2026-04-06 15:58:20.170819	3270
597	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 15:58:20.170819	2026-04-06 15:58:20.170819	3270
607	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:37:12.753553	2026-04-06 23:37:12.753553	3010
608	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:37:12.753553	2026-04-06 23:37:12.753553	3010
609	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:37:12.753553	2026-04-06 23:37:12.753553	3010
619	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:03:36.918528	2026-04-07 00:03:36.918528	1729
620	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:03:36.918528	2026-04-07 00:03:36.918528	1729
621	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:03:36.918528	2026-04-07 00:03:36.918528	1729
631	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:26:25.496245	2026-04-07 00:26:25.496245	1546
632	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:26:25.496245	2026-04-07 00:26:25.496245	1546
633	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:26:25.496245	2026-04-07 00:26:25.496245	1546
643	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:39:36.679942	2026-04-07 00:39:36.679942	1671
644	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:39:36.679942	2026-04-07 00:39:36.679942	1671
645	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:39:36.679942	2026-04-07 00:39:36.679942	1671
655	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:59:54.885553	2026-04-07 00:59:54.885553	1502
656	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:59:54.885553	2026-04-07 00:59:54.885553	1502
657	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:59:54.885553	2026-04-07 00:59:54.885553	1502
667	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:30:48.179869	2026-04-07 01:30:48.179869	1423
668	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:30:48.179869	2026-04-07 01:30:48.179869	1423
669	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:30:48.179869	2026-04-07 01:30:48.179869	1423
679	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:10.036445	2026-04-07 01:42:10.036445	1383
680	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:10.036445	2026-04-07 01:42:10.036445	1383
681	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:10.036445	2026-04-07 01:42:10.036445	1383
691	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:20.57238	2026-04-07 02:26:20.57238	1554
692	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:20.57238	2026-04-07 02:26:20.57238	1554
693	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:20.57238	2026-04-07 02:26:20.57238	1554
703	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:08.012717	2026-04-07 02:34:08.012717	4820
704	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:08.012717	2026-04-07 02:34:08.012717	4820
705	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:08.012717	2026-04-07 02:34:08.012717	4820
715	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:24:49.649293	2026-04-07 10:24:49.649293	2985
716	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:24:49.649293	2026-04-07 10:24:49.649293	2985
717	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:24:49.649293	2026-04-07 10:24:49.649293	2985
727	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:34.787536	2026-04-07 11:22:34.787536	1416
728	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:34.787536	2026-04-07 11:22:34.787536	1416
729	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:34.787536	2026-04-07 11:22:34.787536	1416
739	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:32:04.996339	2026-04-07 11:32:04.996339	1692
740	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:32:04.996339	2026-04-07 11:32:04.996339	1692
741	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:32:04.996339	2026-04-07 11:32:04.996339	1692
751	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:55:32.982645	2026-04-07 11:55:32.982645	1987
752	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:55:32.982645	2026-04-07 11:55:32.982645	1987
753	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:55:32.982645	2026-04-07 11:55:32.982645	1987
763	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:56:02.267708	2026-04-08 03:56:02.267708	2124
764	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:56:02.267708	2026-04-08 03:56:02.267708	2124
765	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 03:56:02.267708	2026-04-08 03:56:02.267708	2124
598	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 16:40:13.177201	2026-04-06 16:40:13.177201	4049
599	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 16:40:13.177201	2026-04-06 16:40:13.177201	4049
600	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 16:40:13.177201	2026-04-06 16:40:13.177201	4049
610	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:53:01.855332	2026-04-06 23:53:01.855332	2072
611	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:53:01.855332	2026-04-06 23:53:01.855332	2072
612	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:53:01.855332	2026-04-06 23:53:01.855332	2072
622	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:07.949307	2026-04-07 00:07:07.949307	1653
623	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:07.949307	2026-04-07 00:07:07.949307	1653
624	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:07.949307	2026-04-07 00:07:07.949307	1653
634	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:27:17.47336	2026-04-07 00:27:17.47336	1841
635	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:27:17.47336	2026-04-07 00:27:17.47336	1841
636	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:27:17.47336	2026-04-07 00:27:17.47336	1841
646	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:42:43.616529	2026-04-07 00:42:43.616529	1848
647	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:42:43.616529	2026-04-07 00:42:43.616529	1848
648	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:42:43.616529	2026-04-07 00:42:43.616529	1848
658	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:32.17807	2026-04-07 01:26:32.17807	1540
659	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:32.17807	2026-04-07 01:26:32.17807	1540
660	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:32.17807	2026-04-07 01:26:32.17807	1540
670	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:15.241361	2026-04-07 01:33:15.241361	1374
671	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:15.241361	2026-04-07 01:33:15.241361	1374
672	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:15.241361	2026-04-07 01:33:15.241361	1374
682	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:40.258985	2026-04-07 01:42:40.258985	1412
683	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:40.258985	2026-04-07 01:42:40.258985	1412
684	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:42:40.258985	2026-04-07 01:42:40.258985	1412
694	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:56.037732	2026-04-07 02:26:56.037732	1443
695	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:56.037732	2026-04-07 02:26:56.037732	1443
696	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:26:56.037732	2026-04-07 02:26:56.037732	1443
706	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:50.872563	2026-04-07 02:34:50.872563	1564
707	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:50.872563	2026-04-07 02:34:50.872563	1564
708	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:34:50.872563	2026-04-07 02:34:50.872563	1564
718	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:54:12.196595	2026-04-07 10:54:12.196595	2031
719	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:54:12.196595	2026-04-07 10:54:12.196595	2031
720	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 10:54:12.196595	2026-04-07 10:54:12.196595	2031
730	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:49.390766	2026-04-07 11:22:49.390766	1325
731	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:49.390766	2026-04-07 11:22:49.390766	1325
732	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:22:49.390766	2026-04-07 11:22:49.390766	1325
742	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:33:11.826253	2026-04-07 11:33:11.826253	1302
743	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:33:11.826253	2026-04-07 11:33:11.826253	1302
744	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:33:11.826253	2026-04-07 11:33:11.826253	1302
754	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:56:02.886507	2026-04-07 11:56:02.886507	1326
755	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:56:02.886507	2026-04-07 11:56:02.886507	1326
756	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:56:02.886507	2026-04-07 11:56:02.886507	1326
766	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020
767	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020
768	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-08 04:06:25.137772	2026-04-08 04:06:25.137772	2020
601	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:11:00.263732	2026-04-06 23:11:00.263732	5455
602	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:11:00.263732	2026-04-06 23:11:00.263732	5455
603	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:11:00.263732	2026-04-06 23:11:00.263732	5455
613	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:56:07.862459	2026-04-06 23:56:07.862459	1669
614	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:56:07.862459	2026-04-06 23:56:07.862459	1669
615	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-06 23:56:07.862459	2026-04-06 23:56:07.862459	1669
625	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:24.317852	2026-04-07 00:07:24.317852	2009
626	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:24.317852	2026-04-07 00:07:24.317852	2009
627	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:07:24.317852	2026-04-07 00:07:24.317852	2009
637	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:28:44.648406	2026-04-07 00:28:44.648406	1665
638	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:28:44.648406	2026-04-07 00:28:44.648406	1665
639	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:28:44.648406	2026-04-07 00:28:44.648406	1665
649	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:46:27.737639	2026-04-07 00:46:27.737639	1398
650	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:46:27.737639	2026-04-07 00:46:27.737639	1398
651	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 00:46:27.737639	2026-04-07 00:46:27.737639	1398
661	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:49.071334	2026-04-07 01:26:49.071334	1648
662	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:49.071334	2026-04-07 01:26:49.071334	1648
663	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:26:49.071334	2026-04-07 01:26:49.071334	1648
673	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:33.841697	2026-04-07 01:33:33.841697	1450
674	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:33.841697	2026-04-07 01:33:33.841697	1450
675	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 01:33:33.841697	2026-04-07 01:33:33.841697	1450
685	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:24:47.675003	2026-04-07 02:24:47.675003	1669
686	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:24:47.675003	2026-04-07 02:24:47.675003	1669
687	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:24:47.675003	2026-04-07 02:24:47.675003	1669
697	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:24.678627	2026-04-07 02:27:24.678627	1446
698	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:24.678627	2026-04-07 02:27:24.678627	1446
699	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:27:24.678627	2026-04-07 02:27:24.678627	1446
709	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:36:38.837826	2026-04-07 02:36:38.837826	1690
710	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:36:38.837826	2026-04-07 02:36:38.837826	1690
711	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 02:36:38.837826	2026-04-07 02:36:38.837826	1690
721	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:06.030878	2026-04-07 11:07:06.030878	2235
722	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:06.030878	2026-04-07 11:07:06.030878	2235
723	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:07:06.030878	2026-04-07 11:07:06.030878	2235
733	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:28:52.147819	2026-04-07 11:28:52.147819	1397
734	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:28:52.147819	2026-04-07 11:28:52.147819	1397
735	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:28:52.147819	2026-04-07 11:28:52.147819	1397
745	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:34:20.476897	2026-04-07 11:34:20.476897	1764
746	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:34:20.476897	2026-04-07 11:34:20.476897	1764
747	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 11:34:20.476897	2026-04-07 11:34:20.476897	1764
757	overview	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629
758	forecast_30d	prophet	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629
759	stock_prediction	rolling_average	completed	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629
\.


--
-- Data for Name: auditlog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditlog (log_id, user_id, action, entity_type, entity_id, "timestamp", details) FROM stdin;
17	5	LOGIN	user	5	2026-04-06 05:52:15.43674	User signed in: Cedie
18	5	LOGIN	user	5	2026-04-06 16:12:05.593925	User signed in: Cedie
25	6	LOGIN	user	6	2026-04-07 00:10:01.879325	User signed in: Totoyz
26	6	LOGIN	user	6	2026-04-07 00:14:33.229071	User signed in: Totoyz
27	6	LOGIN	user	6	2026-04-07 00:15:09.748804	User signed in: Totoyz
28	6	LOGIN	user	6	2026-04-07 00:18:49.688105	User signed in: Totoyz
29	6	LOGIN	user	6	2026-04-07 00:22:55.592331	User signed in: Totoyz
30	6	LOGIN	user	6	2026-04-07 00:24:14.718498	User signed in: Totoyz
13	\N	LOGIN	user	3	2026-04-06 02:33:21.680652	User signed in: rovhic
14	\N	LOGIN	user	3	2026-04-06 02:34:52.766385	User signed in: rovhic
15	\N	LOGIN	user	3	2026-04-06 02:36:01.476604	User signed in: rovhic
16	\N	LOGIN	user	4	2026-04-06 05:44:54.270381	User signed in: test
32	7	LOGIN	user	7	2026-04-07 12:04:22.471211	User signed in: Halcrow01
33	7	LOGIN	user	7	2026-04-07 12:07:02.537929	User signed in: Halcrow01
6	\N	CREATE_SALE	sales	49	2026-04-04 08:35:11.010213	POS sale completed. Invoice: INV-00049. Method: Cash. Total: ₱636.00
7	\N	CREATE_SALE	sales	50	2026-04-04 08:35:49.745279	POS sale completed. Invoice: INV-00050. Method: Cash. Total: ₱4265.44
8	\N	CREATE_SALE	sales	51	2026-04-05 02:45:51.811432	POS sale completed. Invoice: INV-00051. Method: Cash. Total: ₱51.50
9	\N	CREATE_SALE	sales	52	2026-04-05 03:25:10.594282	POS sale completed. Invoice: INV-00052. Method: Cash. Total: ₱636.00
10	\N	CREATE_SALE	sales	53	2026-04-05 21:58:30.908992	POS sale completed. Invoice: INV-00053. Method: Cash. Total: ₱2999.36
11	\N	CREATE_SALE	sales	275	2026-04-06 01:37:05.987978	POS sale completed. Invoice: INV-00275. Method: Cash. Total: ₱1833.40
12	\N	CREATE_SALE	sales	276	2026-04-06 01:59:53.392284	POS sale completed. Invoice: INV-00276. Method: GCash. Total: ₱2128.86
19	\N	CREATE_SALE	sales	277	2026-04-06 16:48:06.33634	POS sale completed. Invoice: INV-00277. Method: Cash. Total: ₱497.84
31	\N	LOGIN	user	1	2026-04-07 02:04:24.537355	User signed in: admin
20	\N	CREATE_SALE	sales	278	2026-04-06 17:11:26.240932	POS sale completed. Invoice: INV-00278. Method: Cash. Total: ₱611.14
21	\N	CREATE_SALE	sales	279	2026-04-06 17:12:42.598317	POS sale completed. Invoice: INV-00279. Method: Cash. Total: ₱5624.24
22	\N	CREATE_SALE	sales	280	2026-04-06 17:13:49.255234	POS sale completed. Invoice: INV-00280. Method: Cash. Total: ₱3570.72
23	\N	CREATE_SALE	sales	281	2026-04-06 23:25:56.132229	POS sale completed. Invoice: INV-00281. Method: Cash. Total: ₱257.50
24	\N	CREATE_SALE	sales	282	2026-04-06 23:44:21.556899	POS sale completed. Invoice: INV-00282. Method: Cash. Total: ₱51.50
34	6	LOGIN	user	6	2026-04-08 04:33:34.311869	User signed in: Totoyz
35	6	LOGIN	user	6	2026-04-08 05:10:27.365789	User signed in: Totoyz
36	6	LOGIN	user	6	2026-04-08 05:12:06.362719	User signed in: Totoyz
37	9	LOGIN	user	9	2026-04-10 03:56:08.634052	User signed in: Cashier
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (category_id, category_name, is_active) FROM stdin;
1	Lubricant	t
2	Spareparts	t
3	Accessories	t
4	Others	t
\.


--
-- Data for Name: customer_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_return_items (item_id, return_id, product_id, quantity, is_defective, is_damaged) FROM stdin;
1	1	227	1	t	f
2	2	324	1	t	f
3	3	10	2	t	f
4	3	21	1	f	f
5	3	241	3	f	f
6	3	299	1	f	f
7	4	302	1	f	t
8	4	442	2	f	f
9	5	324	1	t	f
10	6	60	1	t	f
11	7	46	2	t	f
12	8	227	1	t	f
13	9	324	1	t	f
\.


--
-- Data for Name: customer_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_returns (return_id, rma_number, invoice_id, customer_info, contact_number, action_type, return_status, return_date, notes, sale_id, customer_name, return_type, status, reason, created_at) FROM stdin;
1	RET-2026-001	\N	\N	\N	\N	Pending	2026-04-08 07:17:48.729483	\N	5823	Walk-in Customer	Exchange	Returned to Supplier		2026-04-08 07:17:48.729483
2	RET-2026-002	\N	\N	\N	\N	Pending	2026-04-08 07:24:36.520877	\N	5822	Walk-in Customer	Exchange	Returned to Supplier		2026-04-08 07:24:36.520877
3	RET-2026-003	\N	\N	\N	\N	Pending	2026-04-08 07:28:32.458359	\N	5820	Walk-in Customer	Refund	Returned to Supplier		2026-04-08 07:28:32.458359
4	RET-2026-004	\N	\N	\N	\N	Pending	2026-04-08 11:00:25.297187	\N	5821	Walk-in Customer	Refund	Returned to Supplier		2026-04-08 11:00:25.297187
5	RET-2026-005	\N	\N	\N	\N	Pending	2026-04-08 11:04:07.050914	\N	5822	Walk-in Customer	Exchange	Returned to Supplier	may butas	2026-04-08 11:04:07.050914
6	RET-2026-006	\N	\N	\N	\N	Pending	2026-04-08 11:06:36.149775	\N	5818	Walk-in Customer	Exchange	Returned to Supplier	Test	2026-04-08 11:06:36.149775
7	RET-2026-007	\N	\N	\N	\N	Pending	2026-04-08 11:09:57.363331	\N	5819	Walk-in Customer	Exchange	Returned to Supplier		2026-04-08 11:09:57.363331
8	RET-2026-008	\N	\N	\N	\N	Pending	2026-04-08 11:15:20.676704	\N	5823	Walk-in Customer	Refund	Pending		2026-04-08 11:15:20.676704
9	RET-2026-009	\N	\N	\N	\N	Pending	2026-04-08 13:12:09.290252	\N	5822	Walk-in Customer	Exchange	Returned to Supplier		2026-04-08 13:12:09.290252
\.


--
-- Data for Name: generated_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generated_reports (report_id, report_type, start_date, end_date, generated_by, generated_at) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (inventory_id, product_id, reorder_level, last_updated, quantity, expected, actual, reason_adjustment, status) FROM stdin;
1	1	5	2026-04-06	5	5	5	Initial stock	Active
2	2	5	2026-04-06	10	10	10	Initial stock	Active
3	3	5	2026-04-06	10	10	10	Initial stock	Active
4	4	5	2026-04-06	10	10	10	Initial stock	Active
5	5	5	2026-04-06	10	10	10	Initial stock	Active
7	7	5	2026-04-06	10	10	10	Initial stock	Active
8	8	5	2026-04-06	10	10	10	Initial stock	Active
9	9	5	2026-04-06	10	10	10	Initial stock	Active
11	11	5	2026-04-06	0	0	0	Initial stock	Active
12	12	5	2026-04-06	10	10	10	Initial stock	Active
14	14	5	2026-04-06	0	0	0	Initial stock	Active
16	16	5	2026-04-06	0	0	0	Initial stock	Active
22	22	5	2026-04-06	10	10	10	Initial stock	Active
23	23	5	2026-04-06	10	10	10	Initial stock	Active
24	24	5	2026-04-06	10	10	10	Initial stock	Active
25	25	5	2026-04-06	10	10	10	Initial stock	Active
28	28	5	2026-04-06	0	0	0	Initial import from excel file	Active
29	29	5	2026-04-06	0	0	0	Initial import from excel file	Active
18	18	5	2026-04-06	8	8	8	Initial stock	Active
19	19	5	2026-04-06	8	8	8	Initial stock	Active
20	20	5	2026-04-06	9	9	9	Initial stock	Active
15	15	5	2026-04-06	9	9	9	Initial stock	Active
13	13	5	2026-04-06	9	9	9	Initial stock	Active
17	17	5	2026-04-06	9	9	9	Initial stock	Active
6	6	5	2026-04-06	8	8	8	Initial stock	Active
27	27	5	2026-04-06	8	8	8	Initial stock	Active
26	26	5	2026-04-06	8	8	8	Initial stock	Active
303	303	5	2026-04-06	9	9	9	Initial import	Active
376	376	5	2026-04-06	9	9	9	Initial import	Active
30	30	5	2026-04-06	10	10	10	Initial import	Active
31	31	5	2026-04-06	10	10	10	Initial import	Active
32	32	5	2026-04-06	10	10	10	Initial import	Active
33	33	5	2026-04-06	10	10	10	Initial import	Active
34	34	5	2026-04-06	10	10	10	Initial import	Active
35	35	5	2026-04-06	10	10	10	Initial import	Active
36	36	5	2026-04-06	10	10	10	Initial import	Active
37	37	5	2026-04-06	10	10	10	Initial import	Active
38	38	5	2026-04-06	10	10	10	Initial import	Active
39	39	5	2026-04-06	10	10	10	Initial import	Active
40	40	5	2026-04-06	10	10	10	Initial import	Active
41	41	5	2026-04-06	10	10	10	Initial import	Active
42	42	5	2026-04-06	10	10	10	Initial import	Active
43	43	5	2026-04-06	10	10	10	Initial import	Active
44	44	5	2026-04-06	10	10	10	Initial import	Active
45	45	5	2026-04-06	10	10	10	Initial import	Active
47	47	5	2026-04-06	10	10	10	Initial import	Active
48	48	5	2026-04-06	10	10	10	Initial import	Active
49	49	5	2026-04-06	10	10	10	Initial import	Active
50	50	5	2026-04-06	10	10	10	Initial import	Active
51	51	5	2026-04-06	10	10	10	Initial import	Active
52	52	5	2026-04-06	10	10	10	Initial import	Active
53	53	5	2026-04-06	10	10	10	Initial import	Active
54	54	5	2026-04-06	10	10	10	Initial import	Active
55	55	5	2026-04-06	10	10	10	Initial import	Active
56	56	5	2026-04-06	10	10	10	Initial import	Active
57	57	5	2026-04-06	10	10	10	Initial import	Active
58	58	5	2026-04-06	10	10	10	Initial import	Active
59	59	5	2026-04-06	10	10	10	Initial import	Active
61	61	5	2026-04-06	10	10	10	Initial import	Active
62	62	5	2026-04-06	10	10	10	Initial import	Active
63	63	5	2026-04-06	10	10	10	Initial import	Active
64	64	5	2026-04-06	10	10	10	Initial import	Active
65	65	5	2026-04-06	10	10	10	Initial import	Active
66	66	5	2026-04-06	10	10	10	Initial import	Active
67	67	5	2026-04-06	10	10	10	Initial import	Active
68	68	5	2026-04-06	10	10	10	Initial import	Active
69	69	5	2026-04-06	10	10	10	Initial import	Active
70	70	5	2026-04-06	10	10	10	Initial import	Active
71	71	5	2026-04-06	10	10	10	Initial import	Active
72	72	5	2026-04-06	10	10	10	Initial import	Active
73	73	5	2026-04-06	10	10	10	Initial import	Active
74	74	5	2026-04-06	10	10	10	Initial import	Active
75	75	5	2026-04-06	10	10	10	Initial import	Active
76	76	5	2026-04-06	10	10	10	Initial import	Active
77	77	5	2026-04-06	10	10	10	Initial import	Active
78	78	5	2026-04-06	10	10	10	Initial import	Active
79	79	5	2026-04-06	10	10	10	Initial import	Active
80	80	5	2026-04-06	10	10	10	Initial import	Active
81	81	5	2026-04-06	10	10	10	Initial import	Active
82	82	5	2026-04-06	10	10	10	Initial import	Active
83	83	5	2026-04-06	10	10	10	Initial import	Active
84	84	5	2026-04-06	10	10	10	Initial import	Active
85	85	5	2026-04-06	10	10	10	Initial import	Active
86	86	5	2026-04-06	10	10	10	Initial import	Active
87	87	5	2026-04-06	10	10	10	Initial import	Active
88	88	5	2026-04-06	10	10	10	Initial import	Active
89	89	5	2026-04-06	10	10	10	Initial import	Active
90	90	5	2026-04-06	10	10	10	Initial import	Active
91	91	5	2026-04-06	10	10	10	Initial import	Active
92	92	5	2026-04-06	10	10	10	Initial import	Active
93	93	5	2026-04-06	10	10	10	Initial import	Active
94	94	5	2026-04-06	10	10	10	Initial import	Active
95	95	5	2026-04-06	10	10	10	Initial import	Active
96	96	5	2026-04-06	10	10	10	Initial import	Active
97	97	5	2026-04-06	10	10	10	Initial import	Active
98	98	5	2026-04-06	10	10	10	Initial import	Active
315	315	5	2026-04-07	7	7	7	Initial import	Active
227	227	5	2026-04-08	7	8	8	RET-2026-008	Active
307	307	5	2026-04-07	8	8	8	Return rejected: #4	Active
21	21	5	2026-04-08	11	10	11	RET-2026-003	Active
99	99	5	2026-04-06	10	10	10	Initial import	Active
100	100	5	2026-04-06	10	10	10	Initial import	Active
101	101	5	2026-04-06	10	10	10	Initial import	Active
102	102	5	2026-04-06	10	10	10	Initial import	Active
103	103	5	2026-04-06	10	10	10	Initial import	Active
104	104	5	2026-04-06	10	10	10	Initial import	Active
105	105	5	2026-04-06	10	10	10	Initial import	Active
106	106	5	2026-04-06	10	10	10	Initial import	Active
107	107	5	2026-04-06	10	10	10	Initial import	Active
108	108	5	2026-04-06	10	10	10	Initial import	Active
109	109	5	2026-04-06	10	10	10	Initial import	Active
110	110	5	2026-04-06	10	10	10	Initial import	Active
111	111	5	2026-04-06	10	10	10	Initial import	Active
112	112	5	2026-04-06	10	10	10	Initial import	Active
113	113	5	2026-04-06	10	10	10	Initial import	Active
114	114	5	2026-04-06	10	10	10	Initial import	Active
115	115	5	2026-04-06	10	10	10	Initial import	Active
116	116	5	2026-04-06	10	10	10	Initial import	Active
117	117	5	2026-04-06	10	10	10	Initial import	Active
118	118	5	2026-04-06	10	10	10	Initial import	Active
119	119	5	2026-04-06	10	10	10	Initial import	Active
120	120	5	2026-04-06	10	10	10	Initial import	Active
121	121	5	2026-04-06	10	10	10	Initial import	Active
122	122	5	2026-04-06	10	10	10	Initial import	Active
123	123	5	2026-04-06	10	10	10	Initial import	Active
124	124	5	2026-04-06	10	10	10	Initial import	Active
125	125	5	2026-04-06	10	10	10	Initial import	Active
127	127	5	2026-04-06	10	10	10	Initial import	Active
128	128	5	2026-04-06	10	10	10	Initial import	Active
129	129	5	2026-04-06	10	10	10	Initial import	Active
130	130	5	2026-04-06	10	10	10	Initial import	Active
131	131	5	2026-04-06	10	10	10	Initial import	Active
132	132	5	2026-04-06	10	10	10	Initial import	Active
133	133	5	2026-04-06	10	10	10	Initial import	Active
134	134	5	2026-04-06	10	10	10	Initial import	Active
135	135	5	2026-04-06	10	10	10	Initial import	Active
136	136	5	2026-04-06	10	10	10	Initial import	Active
137	137	5	2026-04-06	10	10	10	Initial import	Active
138	138	5	2026-04-06	10	10	10	Initial import	Active
139	139	5	2026-04-06	10	10	10	Initial import	Active
140	140	5	2026-04-06	10	10	10	Initial import	Active
141	141	5	2026-04-06	10	10	10	Initial import	Active
142	142	5	2026-04-06	10	10	10	Initial import	Active
143	143	5	2026-04-06	10	10	10	Initial import	Active
144	144	5	2026-04-06	10	10	10	Initial import	Active
145	145	5	2026-04-06	10	10	10	Initial import	Active
146	146	5	2026-04-06	10	10	10	Initial import	Active
147	147	5	2026-04-06	10	10	10	Initial import	Active
148	148	5	2026-04-06	10	10	10	Initial import	Active
149	149	5	2026-04-06	10	10	10	Initial import	Active
150	150	5	2026-04-06	10	10	10	Initial import	Active
151	151	5	2026-04-06	10	10	10	Initial import	Active
154	154	5	2026-04-06	10	10	10	Initial import	Active
155	155	5	2026-04-06	10	10	10	Initial import	Active
156	156	5	2026-04-06	10	10	10	Initial import	Active
157	157	5	2026-04-06	10	10	10	Initial import	Active
158	158	5	2026-04-06	10	10	10	Initial import	Active
159	159	5	2026-04-06	10	10	10	Initial import	Active
160	160	5	2026-04-06	10	10	10	Initial import	Active
161	161	5	2026-04-06	10	10	10	Initial import	Active
162	162	5	2026-04-06	10	10	10	Initial import	Active
163	163	5	2026-04-06	10	10	10	Initial import	Active
164	164	5	2026-04-06	10	10	10	Initial import	Active
165	165	5	2026-04-06	10	10	10	Initial import	Active
166	166	5	2026-04-06	10	10	10	Initial import	Active
167	167	5	2026-04-06	10	10	10	Initial import	Active
168	168	5	2026-04-06	10	10	10	Initial import	Active
169	169	5	2026-04-06	10	10	10	Initial import	Active
170	170	5	2026-04-06	10	10	10	Initial import	Active
171	171	5	2026-04-06	10	10	10	Initial import	Active
172	172	5	2026-04-06	10	10	10	Initial import	Active
173	173	5	2026-04-06	10	10	10	Initial import	Active
174	174	5	2026-04-06	10	10	10	Initial import	Active
175	175	5	2026-04-06	10	10	10	Initial import	Active
176	176	5	2026-04-06	10	10	10	Initial import	Active
177	177	5	2026-04-06	10	10	10	Initial import	Active
178	178	5	2026-04-06	10	10	10	Initial import	Active
179	179	5	2026-04-06	10	10	10	Initial import	Active
180	180	5	2026-04-06	10	10	10	Initial import	Active
181	181	5	2026-04-06	10	10	10	Initial import	Active
182	182	5	2026-04-06	10	10	10	Initial import	Active
183	183	5	2026-04-06	10	10	10	Initial import	Active
184	184	5	2026-04-06	10	10	10	Initial import	Active
185	185	5	2026-04-06	10	10	10	Initial import	Active
186	186	5	2026-04-06	10	10	10	Initial import	Active
187	187	5	2026-04-06	10	10	10	Initial import	Active
188	188	5	2026-04-06	10	10	10	Initial import	Active
190	190	5	2026-04-06	10	10	10	Initial import	Active
191	191	5	2026-04-06	10	10	10	Initial import	Active
192	192	5	2026-04-06	10	10	10	Initial import	Active
193	193	5	2026-04-06	10	10	10	Initial import	Active
194	194	5	2026-04-06	10	10	10	Initial import	Active
195	195	5	2026-04-06	10	10	10	Initial import	Active
196	196	5	2026-04-06	10	10	10	Initial import	Active
197	197	5	2026-04-06	10	10	10	Initial import	Active
198	198	5	2026-04-06	10	10	10	Initial import	Active
199	199	5	2026-04-06	10	10	10	Initial import	Active
200	200	5	2026-04-06	10	10	10	Initial import	Active
201	201	5	2026-04-06	10	10	10	Initial import	Active
202	202	5	2026-04-06	10	10	10	Initial import	Active
203	203	5	2026-04-06	10	10	10	Initial import	Active
204	204	5	2026-04-06	10	10	10	Initial import	Active
205	205	5	2026-04-06	10	10	10	Initial import	Active
126	126	5	2026-04-07	7	7	7	Return removed: #7	Active
206	206	5	2026-04-06	10	10	10	Initial import	Active
207	207	5	2026-04-06	10	10	10	Initial import	Active
208	208	5	2026-04-06	10	10	10	Initial import	Active
209	209	5	2026-04-06	10	10	10	Initial import	Active
210	210	5	2026-04-06	10	10	10	Initial import	Active
211	211	5	2026-04-06	10	10	10	Initial import	Active
212	212	5	2026-04-06	10	10	10	Initial import	Active
213	213	5	2026-04-06	10	10	10	Initial import	Active
214	214	5	2026-04-06	10	10	10	Initial import	Active
215	215	5	2026-04-06	10	10	10	Initial import	Active
216	216	5	2026-04-06	10	10	10	Initial import	Active
217	217	5	2026-04-06	10	10	10	Initial import	Active
218	218	5	2026-04-06	10	10	10	Initial import	Active
219	219	5	2026-04-06	10	10	10	Initial import	Active
220	220	5	2026-04-06	10	10	10	Initial import	Active
221	221	5	2026-04-06	10	10	10	Initial import	Active
222	222	5	2026-04-06	10	10	10	Initial import	Active
223	223	5	2026-04-06	10	10	10	Initial import	Active
224	224	5	2026-04-06	10	10	10	Initial import	Active
225	225	5	2026-04-06	10	10	10	Initial import	Active
226	226	5	2026-04-06	10	10	10	Initial import	Active
228	228	5	2026-04-06	10	10	10	Initial import	Active
229	229	5	2026-04-06	10	10	10	Initial import	Active
230	230	5	2026-04-06	10	10	10	Initial import	Active
231	231	5	2026-04-06	10	10	10	Initial import	Active
232	232	5	2026-04-06	10	10	10	Initial import	Active
233	233	5	2026-04-06	10	10	10	Initial import	Active
234	234	5	2026-04-06	10	10	10	Initial import	Active
235	235	5	2026-04-06	10	10	10	Initial import	Active
236	236	5	2026-04-06	10	10	10	Initial import	Active
237	237	5	2026-04-06	10	10	10	Initial import	Active
238	238	5	2026-04-06	10	10	10	Initial import	Active
239	239	5	2026-04-06	10	10	10	Initial import	Active
240	240	5	2026-04-06	10	10	10	Initial import	Active
242	242	5	2026-04-06	10	10	10	Initial import	Active
243	243	5	2026-04-06	10	10	10	Initial import	Active
244	244	5	2026-04-06	10	10	10	Initial import	Active
245	245	5	2026-04-06	10	10	10	Initial import	Active
246	246	5	2026-04-06	10	10	10	Initial import	Active
247	247	5	2026-04-06	10	10	10	Initial import	Active
248	248	5	2026-04-06	10	10	10	Initial import	Active
249	249	5	2026-04-06	10	10	10	Initial import	Active
250	250	5	2026-04-06	10	10	10	Initial import	Active
251	251	5	2026-04-06	10	10	10	Initial import	Active
252	252	5	2026-04-06	10	10	10	Initial import	Active
253	253	5	2026-04-06	10	10	10	Initial import	Active
254	254	5	2026-04-06	10	10	10	Initial import	Active
255	255	5	2026-04-06	10	10	10	Initial import	Active
256	256	5	2026-04-06	10	10	10	Initial import	Active
257	257	5	2026-04-06	10	10	10	Initial import	Active
258	258	5	2026-04-06	10	10	10	Initial import	Active
259	259	5	2026-04-06	10	10	10	Initial import	Active
260	260	5	2026-04-06	10	10	10	Initial import	Active
261	261	5	2026-04-06	10	10	10	Initial import	Active
262	262	5	2026-04-06	10	10	10	Initial import	Active
263	263	5	2026-04-06	10	10	10	Initial import	Active
264	264	5	2026-04-06	10	10	10	Initial import	Active
265	265	5	2026-04-06	10	10	10	Initial import	Active
266	266	5	2026-04-06	10	10	10	Initial import	Active
267	267	5	2026-04-06	10	10	10	Initial import	Active
268	268	5	2026-04-06	10	10	10	Initial import	Active
269	269	5	2026-04-06	10	10	10	Initial import	Active
270	270	5	2026-04-06	10	10	10	Initial import	Active
271	271	5	2026-04-06	10	10	10	Initial import	Active
273	273	5	2026-04-06	10	10	10	Initial import	Active
274	274	5	2026-04-06	10	10	10	Initial import	Active
275	275	5	2026-04-06	10	10	10	Initial import	Active
276	276	5	2026-04-06	10	10	10	Initial import	Active
277	277	5	2026-04-06	10	10	10	Initial import	Active
278	278	5	2026-04-06	10	10	10	Initial import	Active
281	281	5	2026-04-06	10	10	10	Initial import	Active
282	282	5	2026-04-06	10	10	10	Initial import	Active
283	283	5	2026-04-06	10	10	10	Initial import	Active
284	284	5	2026-04-06	10	10	10	Initial import	Active
285	285	5	2026-04-06	10	10	10	Initial import	Active
286	286	5	2026-04-06	10	10	10	Initial import	Active
287	287	5	2026-04-06	10	10	10	Initial import	Active
293	293	5	2026-04-06	10	10	10	Initial import	Active
294	294	5	2026-04-06	10	10	10	Initial import	Active
295	295	5	2026-04-06	10	10	10	Initial import	Active
297	297	5	2026-04-06	10	10	10	Initial import	Active
298	298	5	2026-04-06	10	10	10	Initial import	Active
300	300	5	2026-04-06	10	10	10	Initial import	Active
305	305	5	2026-04-06	10	10	10	Initial import	Active
308	308	5	2026-04-06	10	10	10	Initial import	Active
309	309	5	2026-04-06	10	10	10	Initial import	Active
311	311	5	2026-04-06	10	10	10	Initial import	Active
312	312	5	2026-04-06	10	10	10	Initial import	Active
313	313	5	2026-04-06	10	10	10	Initial import	Active
314	314	5	2026-04-06	10	10	10	Initial import	Active
316	316	5	2026-04-06	10	10	10	Initial import	Active
317	317	5	2026-04-06	10	10	10	Initial import	Active
318	318	5	2026-04-06	10	10	10	Initial import	Active
292	292	5	2026-04-07	9	9	9	Initial import	Active
291	291	5	2026-04-06	8	8	8	Initial import	Active
290	290	5	2026-04-06	9	9	9	Initial import	Active
279	279	5	2026-04-07	9	9	9	Initial import	Active
310	310	5	2026-04-07	8	8	8	Initial import	Active
304	304	5	2026-04-07	9	9	9	Initial import	Active
241	241	5	2026-04-08	13	10	13	RET-2026-003	Active
299	299	5	2026-04-08	11	10	11	RET-2026-003	Active
302	302	5	2026-04-08	10	10	10	RET-2026-004	Active
319	319	5	2026-04-06	10	10	10	Initial import	Active
320	320	5	2026-04-06	10	10	10	Initial import	Active
321	321	5	2026-04-06	10	10	10	Initial import	Active
325	325	5	2026-04-06	10	10	10	Initial import	Active
326	326	5	2026-04-06	10	10	10	Initial import	Active
327	327	5	2026-04-06	10	10	10	Initial import	Active
328	328	5	2026-04-06	10	10	10	Initial import	Active
329	329	5	2026-04-06	10	10	10	Initial import	Active
330	330	5	2026-04-06	10	10	10	Initial import	Active
331	331	5	2026-04-06	10	10	10	Initial import	Active
332	332	5	2026-04-06	10	10	10	Initial import	Active
333	333	5	2026-04-06	10	10	10	Initial import	Active
334	334	5	2026-04-06	10	10	10	Initial import	Active
335	335	5	2026-04-06	10	10	10	Initial import	Active
336	336	5	2026-04-06	10	10	10	Initial import	Active
337	337	5	2026-04-06	10	10	10	Initial import	Active
338	338	5	2026-04-06	10	10	10	Initial import	Active
339	339	5	2026-04-06	10	10	10	Initial import	Active
340	340	5	2026-04-06	10	10	10	Initial import	Active
341	341	5	2026-04-06	10	10	10	Initial import	Active
342	342	5	2026-04-06	10	10	10	Initial import	Active
343	343	5	2026-04-06	10	10	10	Initial import	Active
344	344	5	2026-04-06	10	10	10	Initial import	Active
345	345	5	2026-04-06	10	10	10	Initial import	Active
346	346	5	2026-04-06	10	10	10	Initial import	Active
347	347	5	2026-04-06	10	10	10	Initial import	Active
348	348	5	2026-04-06	10	10	10	Initial import	Active
349	349	5	2026-04-06	10	10	10	Initial import	Active
350	350	5	2026-04-06	10	10	10	Initial import	Active
351	351	5	2026-04-06	10	10	10	Initial import	Active
352	352	5	2026-04-06	10	10	10	Initial import	Active
353	353	5	2026-04-06	10	10	10	Initial import	Active
354	354	5	2026-04-06	10	10	10	Initial import	Active
355	355	5	2026-04-06	10	10	10	Initial import	Active
356	356	5	2026-04-06	10	10	10	Initial import	Active
357	357	5	2026-04-06	10	10	10	Initial import	Active
358	358	5	2026-04-06	10	10	10	Initial import	Active
359	359	5	2026-04-06	10	10	10	Initial import	Active
360	360	5	2026-04-06	10	10	10	Initial import	Active
361	361	5	2026-04-06	10	10	10	Initial import	Active
362	362	5	2026-04-06	10	10	10	Initial import	Active
363	363	5	2026-04-06	10	10	10	Initial import	Active
364	364	5	2026-04-06	10	10	10	Initial import	Active
365	365	5	2026-04-06	10	10	10	Initial import	Active
366	366	5	2026-04-06	10	10	10	Initial import	Active
367	367	5	2026-04-06	10	10	10	Initial import	Active
368	368	5	2026-04-06	10	10	10	Initial import	Active
369	369	5	2026-04-06	10	10	10	Initial import	Active
370	370	5	2026-04-06	10	10	10	Initial import	Active
371	371	5	2026-04-06	10	10	10	Initial import	Active
372	372	5	2026-04-06	10	10	10	Initial import	Active
373	373	5	2026-04-06	10	10	10	Initial import	Active
374	374	5	2026-04-06	10	10	10	Initial import	Active
375	375	5	2026-04-06	10	10	10	Initial import	Active
377	377	5	2026-04-06	10	10	10	Initial import	Active
378	378	5	2026-04-06	10	10	10	Initial import	Active
379	379	5	2026-04-06	10	10	10	Initial import	Active
380	380	5	2026-04-06	10	10	10	Initial import	Active
381	381	5	2026-04-06	10	10	10	Initial import	Active
382	382	5	2026-04-06	10	10	10	Initial import	Active
383	383	5	2026-04-06	10	10	10	Initial import	Active
385	385	5	2026-04-06	10	10	10	Initial import	Active
386	386	5	2026-04-06	10	10	10	Initial import	Active
387	387	5	2026-04-06	10	10	10	Initial import	Active
388	388	5	2026-04-06	10	10	10	Initial import	Active
389	389	5	2026-04-06	10	10	10	Initial import	Active
390	390	5	2026-04-06	10	10	10	Initial import	Active
391	391	5	2026-04-06	10	10	10	Initial import	Active
392	392	5	2026-04-06	10	10	10	Initial import	Active
393	393	5	2026-04-06	10	10	10	Initial import	Active
394	394	5	2026-04-06	10	10	10	Initial import	Active
395	395	5	2026-04-06	10	10	10	Initial import	Active
396	396	5	2026-04-06	10	10	10	Initial import	Active
397	397	5	2026-04-06	10	10	10	Initial import	Active
398	398	5	2026-04-06	10	10	10	Initial import	Active
399	399	5	2026-04-06	10	10	10	Initial import	Active
400	400	5	2026-04-06	10	10	10	Initial import	Active
401	401	5	2026-04-06	10	10	10	Initial import	Active
402	402	5	2026-04-06	10	10	10	Initial import	Active
403	403	5	2026-04-06	10	10	10	Initial import	Active
404	404	5	2026-04-06	10	10	10	Initial import	Active
405	405	5	2026-04-06	10	10	10	Initial import	Active
406	406	5	2026-04-06	10	10	10	Initial import	Active
407	407	5	2026-04-06	10	10	10	Initial import	Active
408	408	5	2026-04-06	10	10	10	Initial import	Active
409	409	5	2026-04-06	10	10	10	Initial import	Active
410	410	5	2026-04-06	10	10	10	Initial import	Active
411	411	5	2026-04-06	10	10	10	Initial import	Active
412	412	5	2026-04-06	10	10	10	Initial import	Active
413	413	5	2026-04-06	10	10	10	Initial import	Active
414	414	5	2026-04-06	10	10	10	Initial import	Active
415	415	5	2026-04-06	10	10	10	Initial import	Active
416	416	5	2026-04-06	10	10	10	Initial import	Active
417	417	5	2026-04-06	10	10	10	Initial import	Active
418	418	5	2026-04-06	10	10	10	Initial import	Active
419	419	5	2026-04-06	10	10	10	Initial import	Active
420	420	5	2026-04-06	10	10	10	Initial import	Active
421	421	5	2026-04-06	10	10	10	Initial import	Active
422	422	5	2026-04-06	10	10	10	Initial import	Active
423	423	5	2026-04-06	10	10	10	Initial import	Active
424	424	5	2026-04-06	10	10	10	Initial import	Active
426	426	5	2026-04-06	10	10	10	Initial import	Active
427	427	5	2026-04-06	10	10	10	Initial import	Active
428	428	5	2026-04-06	10	10	10	Initial import	Active
322	322	5	2026-04-06	9	9	9	Initial import	Active
429	429	5	2026-04-06	10	10	10	Initial import	Active
430	430	5	2026-04-06	10	10	10	Initial import	Active
431	431	5	2026-04-06	10	10	10	Initial import	Active
432	432	5	2026-04-06	10	10	10	Initial import	Active
433	433	5	2026-04-06	10	10	10	Initial import	Active
434	434	5	2026-04-06	10	10	10	Initial import	Active
435	435	5	2026-04-06	10	10	10	Initial import	Active
436	436	5	2026-04-06	10	10	10	Initial import	Active
437	437	5	2026-04-06	10	10	10	Initial import	Active
438	438	5	2026-04-06	10	10	10	Initial import	Active
439	439	5	2026-04-06	10	10	10	Initial import	Active
440	440	5	2026-04-06	10	10	10	Initial import	Active
441	441	5	2026-04-06	10	10	10	Initial import	Active
444	444	5	2026-04-06	10	10	10	Initial import	Active
445	445	5	2026-04-06	10	10	10	Initial import	Active
446	446	5	2026-04-06	10	10	10	Initial import	Active
447	447	5	2026-04-06	10	10	10	Initial import	Active
448	448	5	2026-04-06	10	10	10	Initial import	Active
449	449	5	2026-04-06	10	10	10	Initial import	Active
450	450	5	2026-04-06	10	10	10	Initial import	Active
451	451	5	2026-04-06	10	10	10	Initial import	Active
452	452	5	2026-04-06	10	10	10	Initial import	Active
453	453	5	2026-04-06	10	10	10	Initial import	Active
454	454	5	2026-04-06	10	10	10	Initial import	Active
455	455	5	2026-04-06	10	10	10	Initial import	Active
456	456	5	2026-04-06	10	10	10	Initial import	Active
457	457	5	2026-04-06	10	10	10	Initial import	Active
458	458	5	2026-04-06	10	10	10	Initial import	Active
459	459	5	2026-04-06	10	10	10	Initial import	Active
460	460	5	2026-04-06	10	10	10	Initial import	Active
461	461	5	2026-04-06	10	10	10	Initial import	Active
462	462	5	2026-04-06	10	10	10	Initial import	Active
463	463	5	2026-04-06	10	10	10	Initial import	Active
464	464	5	2026-04-06	10	10	10	Initial import	Active
443	443	5	2026-04-06	9	9	9	Initial import	Active
323	323	5	2026-04-06	8	8	8	Initial import	Active
301	301	5	2026-04-06	8	8	8	Initial import	Active
153	153	5	2026-04-06	9	9	9	Initial import	Active
425	425	5	2026-04-06	8	8	8	Initial import	Active
280	280	5	2026-04-06	9	9	9	Initial import	Active
306	306	5	2026-04-06	9	9	9	Initial import	Active
296	296	5	2026-04-06	8	8	8	Initial import	Active
288	288	5	2026-04-06	9	9	9	Initial import	Active
189	189	5	2026-04-06	9	9	9	Initial import	Active
272	272	5	2026-04-06	4	4	4	Initial import	Active
152	152	5	2026-04-06	0	0	0	Initial import	Active
384	384	5	2026-04-06	0	0	0	Initial import	Active
289	289	5	2026-04-07	3	3	3	Return removed: #3	Active
10	10	5	2026-04-08	10	10	10	RET-2026-003	Active
60	60	5	2026-04-08	9	10	9	RET-2026-006	Active
46	46	5	2026-04-08	8	10	8	RET-2026-007	Active
442	442	5	2026-04-08	12	10	12	RET-2026-004	Active
465	465	5	2026-04-08	10	10	10	Initial stock	Active
324	324	5	2026-04-08	3	6	3	RET-2026-009	Active
\.


--
-- Data for Name: inventory_stock_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_stock_events (event_id, inventory_id, product_id, event_type, quantity_before, quantity_after, expected_before, expected_after, actual_before, actual_after, quantity_delta, expected_delta, actual_delta, difference_before, difference_after, reference_type, reference_id, reason, created_at) FROM stdin;
16	289	289	RETURN_ALLOCATED	10	10	10	9	10	9	0	-1	-1	0	-1	product_returns	3	damaged	2026-04-06 16:43:12.705736
17	289	289	RETURN_APPROVED	9	8	8	8	8	8	-1	0	0	-1	0	product_returns	3		2026-04-06 17:16:41.181198
18	307	307	RETURN_ALLOCATED	9	9	9	8	9	8	0	-1	-1	0	-1	product_returns	4	CANOLA OIL	2026-04-06 17:18:11.339341
19	126	126	RETURN_ALLOCATED	10	10	10	9	10	9	0	-1	-1	0	-1	product_returns	7	CANOLA OIL	2026-04-06 17:19:40.637063
20	126	126	RETURN_APPROVED	10	9	9	9	9	9	-1	0	0	-1	0	product_returns	7		2026-04-06 17:20:22.930613
21	307	307	RETURN_REJECTED	9	9	8	9	8	9	0	1	1	-1	0	product_returns	4		2026-04-06 17:20:26.365089
22	324	324	RETURN_ALLOCATED	9	9	9	8	9	8	0	-1	-1	0	-1	product_returns	8	DAMAGED	2026-04-06 17:20:53.619378
23	324	324	RETURN_APPROVED	9	8	8	8	8	8	-1	0	0	-1	0	product_returns	8		2026-04-06 17:21:58.248938
25	227	227	CUSTOMER_RETURN_TO_SUPPLIER	7	7	8	8	8	7	0	0	-1	1	-1	customer_returns	1	Returned to supplier	2026-04-08 07:18:25.683579
27	324	324	CUSTOMER_RETURN_TO_SUPPLIER	5	5	6	6	6	5	0	0	-1	1	-1	customer_returns	2	Returned to supplier	2026-04-08 07:24:58.810306
32	10	10	CUSTOMER_RETURN_TO_SUPPLIER	10	10	10	10	12	10	0	0	-2	4	0	customer_returns	3	Returned to supplier	2026-04-08 07:28:58.335532
35	302	302	CUSTOMER_RETURN_TO_SUPPLIER	10	10	10	10	11	10	0	0	-1	2	0	customer_returns	4	Returned to supplier	2026-04-08 11:02:45.139978
37	324	324	CUSTOMER_RETURN_TO_SUPPLIER	4	4	6	6	5	4	0	0	-1	0	-2	customer_returns	5	Returned to supplier	2026-04-08 11:05:38.556048
39	60	60	CUSTOMER_RETURN_TO_SUPPLIER	9	9	10	10	10	9	0	0	-1	1	-1	customer_returns	6	Returned to supplier	2026-04-08 11:07:03.014559
41	46	46	CUSTOMER_RETURN_TO_SUPPLIER	8	8	10	10	10	8	0	0	-2	2	-2	customer_returns	7	Returned to supplier	2026-04-08 11:10:59.009573
24	227	227	CUSTOMER_RETURN_EXCHANGE	8	7	8	8	8	8	-1	0	0	0	1	customer_returns	1	RET-2026-001	2026-04-08 07:17:48.729483
26	324	324	CUSTOMER_RETURN_EXCHANGE	6	5	6	6	6	6	-1	0	0	0	1	customer_returns	2	RET-2026-002	2026-04-08 07:24:36.520877
28	10	10	CUSTOMER_RETURN_REFUND_DEFECTIVE	10	10	10	10	10	12	0	0	2	0	4	customer_returns	3	RET-2026-003	2026-04-08 07:28:32.458359
29	21	21	CUSTOMER_RETURN_REFUND_GOOD	10	11	10	10	10	11	1	0	1	0	1	customer_returns	3	RET-2026-003	2026-04-08 07:28:32.458359
30	241	241	CUSTOMER_RETURN_REFUND_GOOD	10	13	10	10	10	13	3	0	3	0	3	customer_returns	3	RET-2026-003	2026-04-08 07:28:32.458359
31	299	299	CUSTOMER_RETURN_REFUND_GOOD	10	11	10	10	10	11	1	0	1	0	1	customer_returns	3	RET-2026-003	2026-04-08 07:28:32.458359
33	302	302	CUSTOMER_RETURN_REFUND_DEFECTIVE	10	10	10	10	10	11	0	0	1	0	2	customer_returns	4	RET-2026-004	2026-04-08 11:00:25.297187
34	442	442	CUSTOMER_RETURN_REFUND_GOOD	10	12	10	10	10	12	2	0	2	0	2	customer_returns	4	RET-2026-004	2026-04-08 11:00:25.297187
36	324	324	CUSTOMER_RETURN_EXCHANGE	5	4	6	6	5	5	-1	0	0	-1	0	customer_returns	5	RET-2026-005	2026-04-08 11:04:07.050914
38	60	60	CUSTOMER_RETURN_EXCHANGE	10	9	10	10	10	10	-1	0	0	0	1	customer_returns	6	RET-2026-006	2026-04-08 11:06:36.149775
40	46	46	CUSTOMER_RETURN_EXCHANGE	10	8	10	10	10	10	-2	0	0	0	2	customer_returns	7	RET-2026-007	2026-04-08 11:09:57.363331
42	227	227	CUSTOMER_RETURN_REFUND_DEFECTIVE	7	7	8	8	7	8	0	0	1	-1	1	customer_returns	8	RET-2026-008	2026-04-08 11:15:20.676704
43	324	324	CUSTOMER_RETURN_EXCHANGE	4	3	6	6	4	4	-1	0	0	-2	-1	customer_returns	9	RET-2026-009	2026-04-08 13:12:09.290252
44	324	324	CUSTOMER_RETURN_TO_SUPPLIER	3	3	6	6	4	3	0	0	-1	-1	-3	customer_returns	9	Returned to supplier	2026-04-08 13:13:11.983093
\.


--
-- Data for Name: lowstockalerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lowstockalerts (alert_id, product_id, inventory_id, threshold, quantity, status, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (notification_id, user_id, type, title, message, link, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id) FROM stdin;
510	5626	Cash	296.64	2026-03-26 11:53:00	\N
511	5627	Cash	1173.99	2026-03-26 11:03:00	\N
512	5628	Cash	562.01	2026-03-26 09:20:00	\N
513	5629	Cash	3955.71	2026-03-26 14:00:00	\N
514	5630	Cash	472.77	2026-03-26 14:48:00	\N
515	5631	Cash	152.65	2026-03-26 16:33:00	\N
516	5632	Cash	3480.10	2026-03-26 12:49:00	\N
517	5633	Cash	349.90	2026-03-26 17:13:00	\N
518	5634	Cash	393.05	2026-03-26 15:39:00	\N
519	5635	Cash	58.71	2026-03-26 11:28:00	\N
520	5636	Cash	98.88	2026-03-26 19:41:00	\N
521	5637	Cash	1004.25	2026-03-26 10:23:00	\N
522	5638	Cash	579.64	2026-03-27 15:52:00	\N
523	5639	Cash	1333.51	2026-03-27 16:20:00	\N
524	5640	Cash	1321.49	2026-03-27 17:34:00	\N
525	5641	Cash	26.04	2026-03-27 10:10:00	\N
526	5642	Cash	896.10	2026-03-27 18:46:00	\N
527	5643	Cash	6160.17	2026-03-27 14:20:00	\N
528	5644	Cash	450.07	2026-03-27 11:48:00	\N
529	5645	Cash	4404.55	2026-03-27 15:03:00	\N
530	5646	Cash	392.43	2026-03-27 13:26:00	\N
531	5647	Cash	4574.44	2026-03-27 19:12:00	\N
532	5648	Cash	696.28	2026-03-27 12:46:00	\N
533	5649	Cash	1232.68	2026-03-27 10:00:00	\N
534	5650	Cash	26.78	2026-03-27 15:24:00	\N
535	5651	Cash	1004.22	2026-03-28 15:09:00	\N
536	5652	Cash	1575.64	2026-03-28 09:32:00	\N
537	5653	Cash	515.95	2026-03-28 16:31:00	\N
538	5654	Cash	314.15	2026-03-28 09:04:00	\N
539	5655	Cash	208.38	2026-03-28 16:33:00	\N
540	5656	Cash	345.59	2026-03-28 17:16:00	\N
541	5657	Cash	1149.48	2026-03-28 13:11:00	\N
542	5658	Cash	1154.49	2026-03-28 12:35:00	\N
543	5659	Cash	425.80	2026-03-28 15:57:00	\N
544	5660	Cash	2811.90	2026-03-28 17:19:00	\N
545	5661	Cash	1985.23	2026-03-28 19:38:00	\N
546	5662	Cash	633.45	2026-03-28 16:38:00	\N
547	5663	Cash	230.72	2026-03-28 10:00:00	\N
548	5664	Cash	5815.96	2026-03-29 14:59:00	\N
549	5665	Cash	221.98	2026-03-29 09:01:00	\N
550	5666	Cash	1027.33	2026-03-29 14:50:00	\N
551	5667	Cash	618.00	2026-03-29 14:50:00	\N
552	5668	Cash	7240.08	2026-03-29 09:50:00	\N
553	5669	Cash	193.93	2026-03-29 10:37:00	\N
554	5670	Cash	692.68	2026-03-29 13:37:00	\N
555	5671	Cash	456.05	2026-03-29 09:15:00	\N
556	5672	Cash	537.66	2026-03-29 15:54:00	\N
557	5673	Cash	527.36	2026-03-29 09:57:00	\N
558	5674	Cash	833.21	2026-03-29 18:39:00	\N
559	5675	Cash	690.10	2026-03-29 09:31:00	\N
560	5676	Cash	993.56	2026-03-29 12:38:00	\N
561	5677	Cash	88.20	2026-03-29 11:52:00	\N
562	5678	Cash	1101.91	2026-03-29 14:14:00	\N
563	5679	Cash	350.20	2026-03-29 15:03:00	\N
564	5680	Cash	1049.44	2026-03-29 09:03:00	\N
565	5681	Cash	249.26	2026-03-29 19:07:00	\N
566	5682	Cash	2.06	2026-03-29 13:51:00	\N
567	5683	Cash	3800.29	2026-03-29 15:26:00	\N
568	5684	Cash	368.49	2026-03-29 11:13:00	\N
569	5685	Cash	563.90	2026-03-29 17:29:00	\N
570	5686	Cash	570.08	2026-03-29 09:20:00	\N
571	5687	Cash	473.80	2026-03-29 10:21:00	\N
572	5688	Cash	4.64	2026-03-29 10:01:00	\N
573	5689	Cash	350.71	2026-03-29 16:05:00	\N
574	5690	Cash	606.62	2026-03-30 19:10:00	\N
575	5691	Cash	391.40	2026-03-30 12:55:00	\N
576	5692	Cash	652.08	2026-03-30 13:20:00	\N
577	5693	Cash	1077.38	2026-03-30 14:34:00	\N
578	5694	Cash	30.90	2026-03-30 09:06:00	\N
579	5695	Cash	851.86	2026-03-30 14:11:00	\N
580	5696	Cash	1402.98	2026-03-30 15:43:00	\N
581	5697	Cash	30.90	2026-03-30 18:47:00	\N
582	5698	Cash	363.78	2026-03-30 17:47:00	\N
583	5699	Cash	440.84	2026-03-30 16:02:00	\N
584	5700	Cash	597.40	2026-03-30 17:25:00	\N
585	5701	Cash	25.75	2026-03-30 12:57:00	\N
586	5702	Cash	1598.43	2026-03-31 15:48:00	\N
587	5703	Cash	1171.01	2026-03-31 15:41:00	\N
588	5704	Cash	291.24	2026-03-31 14:19:00	\N
589	5705	Cash	978.42	2026-03-31 16:13:00	\N
590	5706	Cash	464.77	2026-03-31 12:53:00	\N
591	5707	Cash	30.90	2026-03-31 11:47:00	\N
592	5708	Cash	652.63	2026-03-31 10:47:00	\N
593	5709	Cash	471.74	2026-03-31 14:32:00	\N
594	5710	Cash	3473.77	2026-03-31 10:20:00	\N
595	5711	Cash	1301.10	2026-03-31 10:39:00	\N
596	5712	Cash	1128.88	2026-03-31 12:16:00	\N
597	5713	Cash	113.30	2026-03-31 16:43:00	\N
598	5714	Cash	1394.62	2026-03-31 18:03:00	\N
599	5715	Cash	8656.87	2026-04-01 15:26:00	\N
600	5716	Cash	986.93	2026-04-01 15:36:00	\N
601	5717	Cash	4230.30	2026-04-01 11:46:00	\N
602	5718	Cash	2193.90	2026-04-01 14:30:00	\N
603	5719	Cash	421.27	2026-04-01 14:02:00	\N
604	5720	Cash	1021.69	2026-04-01 19:26:00	\N
605	5721	Cash	12.36	2026-04-01 16:19:00	\N
606	5722	Cash	272.13	2026-04-01 19:33:00	\N
607	5723	Cash	417.15	2026-04-01 19:53:00	\N
608	5724	Cash	3075.58	2026-04-01 11:05:00	\N
609	5725	Cash	829.15	2026-04-01 16:14:00	\N
610	5726	Cash	61.80	2026-04-01 18:30:00	\N
611	5727	Cash	492.34	2026-04-01 16:21:00	\N
612	5728	Cash	285.90	2026-04-01 10:55:00	\N
613	5729	Cash	908.70	2026-04-01 15:27:00	\N
614	5730	Cash	771.26	2026-04-01 12:48:00	\N
615	5731	Cash	1712.33	2026-04-01 14:49:00	\N
616	5732	Cash	377.80	2026-04-01 09:25:00	\N
617	5733	Cash	700.40	2026-04-01 12:25:00	\N
618	5734	Cash	225.11	2026-04-02 12:46:00	\N
619	5735	Cash	1474.45	2026-04-02 11:45:00	\N
620	5736	Cash	1249.23	2026-04-02 13:42:00	\N
621	5737	Cash	77.25	2026-04-02 13:43:00	\N
622	5738	Cash	831.96	2026-04-02 11:28:00	\N
623	5739	Cash	808.94	2026-04-02 13:53:00	\N
624	5740	Cash	662.86	2026-04-02 12:13:00	\N
625	5741	Cash	143.17	2026-04-03 13:56:00	\N
626	5742	Cash	1257.51	2026-04-04 13:46:00	\N
627	5743	Cash	1664.25	2026-04-04 10:26:00	\N
628	5744	Cash	606.15	2026-04-04 09:06:00	\N
629	5745	Cash	185.40	2026-04-04 14:09:00	\N
630	5746	Cash	760.14	2026-04-04 09:49:00	\N
631	5747	Cash	1225.99	2026-04-04 17:24:00	\N
632	5748	Cash	1532.38	2026-04-04 10:42:00	\N
633	5749	Cash	7003.18	2026-04-05 12:02:00	\N
634	5750	Cash	2462.73	2026-04-05 16:41:00	\N
635	5751	Cash	381.10	2026-04-05 12:58:00	\N
636	5752	Cash	201.88	2026-04-05 13:44:00	\N
637	5753	Cash	297.67	2026-04-05 18:48:00	\N
638	5754	Cash	1190.04	2026-04-05 17:59:00	\N
639	5755	Cash	199.28	2026-04-05 10:54:00	\N
640	5756	Cash	162.22	2026-04-05 09:48:00	\N
641	5757	Cash	25.75	2026-04-05 15:40:00	\N
642	5758	Cash	10.30	2026-04-05 11:19:00	\N
643	5759	Cash	1143.27	2026-04-05 17:34:00	\N
644	5760	Cash	114.33	2026-04-05 17:30:00	\N
645	5761	Cash	164.09	2026-04-05 10:14:00	\N
646	5762	Cash	1488.26	2026-04-05 13:48:00	\N
647	5763	Cash	780.01	2026-04-05 10:20:00	\N
648	5764	Cash	269.88	2026-04-05 19:14:00	\N
649	5765	Cash	820.85	2026-04-05 13:10:00	\N
650	5766	Cash	226.38	2026-04-05 17:03:00	\N
651	5767	Cash	4988.71	2026-04-05 16:15:00	\N
652	5768	Cash	1646.85	2026-04-05 10:35:00	\N
653	5769	Cash	1293.76	2026-04-05 14:21:00	\N
654	5770	Cash	290.18	2026-04-05 09:15:00	\N
655	5771	Cash	637.70	2026-04-05 13:13:00	\N
656	5772	Cash	550.30	2026-04-05 14:26:00	\N
657	5773	Cash	911.67	2026-04-05 13:57:00	\N
658	5774	Cash	247.20	2026-04-05 09:28:00	\N
659	5775	Cash	4084.57	2026-04-05 09:15:00	\N
660	5776	Cash	41.41	2026-04-05 19:35:00	\N
661	5777	Cash	214.24	2026-04-05 18:34:00	\N
662	5778	Cash	2067.64	2026-04-05 09:50:00	\N
663	5779	Cash	144.20	2026-04-05 13:42:00	\N
664	5780	Cash	789.49	2026-04-05 16:08:00	\N
665	5781	Cash	4430.19	2026-04-05 12:40:00	\N
666	5782	Cash	1374.69	2026-04-05 12:44:00	\N
667	5783	Cash	460.41	2026-04-05 14:01:00	\N
668	5784	Cash	191.58	2026-04-06 19:34:00	\N
669	5785	Cash	1040.92	2026-04-06 15:46:00	\N
670	5786	Cash	164.09	2026-04-06 19:02:00	\N
671	5787	Cash	1395.65	2026-04-06 11:25:00	\N
672	5788	Cash	349.17	2026-04-06 17:58:00	\N
673	5789	Cash	123.60	2026-04-06 11:26:00	\N
674	5790	Cash	346.08	2026-04-06 19:48:00	\N
675	5791	Cash	3.09	2026-04-06 13:05:00	\N
676	5792	Cash	265.74	2026-04-06 17:43:00	\N
677	5793	Cash	973.22	2026-04-06 18:46:00	\N
678	5794	Cash	390.48	2026-04-06 10:37:00	\N
679	5795	Cash	850.67	2026-04-06 15:02:00	\N
680	5796	Cash	723.06	2026-04-07 19:05:00	\N
681	5797	Cash	2459.64	2026-04-07 11:01:00	\N
682	5798	Cash	510.96	2026-04-07 10:00:00	\N
683	5799	Cash	82.40	2026-04-07 13:32:00	\N
684	5800	Cash	795.48	2026-04-07 15:41:00	\N
685	5801	Cash	1050.69	2026-04-07 17:15:00	\N
686	5802	Cash	1552.92	2026-04-07 10:41:00	\N
687	5803	Cash	20.60	2026-04-07 14:55:00	\N
688	5804	Cash	4270.56	2026-04-07 14:59:00	\N
689	5805	Cash	41.20	2026-04-07 19:41:00	\N
690	5806	Cash	2712.71	2026-04-07 16:48:00	\N
691	5807	Cash	1690.13	2026-04-07 11:31:00	\N
692	5808	Cash	244.11	2026-04-07 15:13:00	\N
693	5809	Cash	1191.44	2026-04-08 10:24:00	\N
694	5810	Cash	887.65	2026-04-08 15:52:00	\N
695	5811	Cash	1106.22	2026-04-08 16:56:00	\N
696	5812	Cash	1388.31	2026-04-08 10:37:00	\N
697	5813	Cash	1561.90	2026-04-08 13:29:00	\N
698	5814	Cash	594.82	2026-04-08 17:25:00	\N
699	5815	Cash	1336.69	2026-04-08 09:53:00	\N
700	5816	Cash	624.18	2026-04-08 09:44:00	\N
701	5817	Cash	872.17	2026-04-08 11:35:00	\N
702	5818	Cash	12.36	2026-04-08 10:09:00	\N
703	5819	Cash	5156.93	2026-04-08 14:15:00	\N
704	5820	Cash	1509.83	2026-04-08 13:34:00	\N
705	5821	Cash	792.87	2026-04-08 19:39:00	\N
706	5822	Cash	120.00	2026-04-08 05:30:48.305321	\N
707	5823	Cash	300.00	2026-04-08 06:36:10.170131	\N
\.


--
-- Data for Name: pos_terminals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pos_terminals (terminal_id, terminal_name, location, status, pos_id) FROM stdin;
1	POS Terminal #01	Main	Active	1
\.


--
-- Data for Name: product_price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_price_history (history_id, product_id, old_price, new_price, changed_at, changed_by) FROM stdin;
8	1	\N	550.00	2026-04-04 08:33:04.532629	\N
9	2	\N	250.00	2026-04-04 08:34:19.205258	\N
10	1	\N	309.00	2026-04-06 00:50:51.871211	\N
11	2	\N	234.00	2026-04-06 00:51:31.030613	\N
12	3	\N	61.00	2026-04-06 00:52:18.385321	\N
13	4	\N	260.00	2026-04-06 00:53:26.826627	\N
14	5	\N	300.00	2026-04-06 00:54:25.985072	\N
15	6	\N	325.00	2026-04-06 00:55:38.430706	\N
16	7	\N	238.00	2026-04-06 00:56:46.111024	\N
17	8	\N	70.00	2026-04-06 00:58:53.335777	\N
18	9	\N	275.00	2026-04-06 00:59:54.932604	\N
19	10	\N	290.00	2026-04-06 01:01:39.609193	\N
20	11	\N	88.00	2026-04-06 01:03:23.186542	\N
21	12	\N	20.00	2026-04-06 01:10:47.14021	\N
22	13	\N	7.00	2026-04-06 01:11:54.844363	\N
23	14	\N	70.00	2026-04-06 01:12:49.40762	\N
24	15	\N	98.00	2026-04-06 01:13:35.246286	\N
25	16	\N	1.00	2026-04-06 01:14:14.838682	\N
26	17	\N	35.50	2026-04-06 01:15:47.38922	\N
27	18	\N	33.00	2026-04-06 01:16:57.597274	\N
28	19	\N	33.00	2026-04-06 01:17:35.133609	\N
29	20	\N	30.00	2026-04-06 01:18:41.209046	\N
30	21	\N	30.00	2026-04-06 01:20:06.381715	\N
31	22	\N	30.00	2026-04-06 01:20:35.523198	\N
32	23	\N	30.00	2026-04-06 01:20:56.3256	\N
33	24	\N	30.00	2026-04-06 01:21:35.634972	\N
34	25	\N	30.00	2026-04-06 01:22:41.240908	\N
35	26	\N	12.00	2026-04-06 01:23:35.280981	\N
36	27	\N	25.00	2026-04-06 01:24:43.93932	\N
37	28	\N	289.00	2026-04-06 01:31:46.709954	\N
38	29	\N	325.00	2026-04-06 01:31:46.709954	\N
39	465	\N	0.12	2026-04-06 16:46:39.878305	\N
40	465	\N	2000.50	2026-04-08 13:19:59.936301	\N
\.


--
-- Data for Name: product_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_return_items (item_id, return_id, product_id, quantity) FROM stdin;
3	3	289	1
4	4	307	1
5	7	126	1
6	8	324	1
\.


--
-- Data for Name: product_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_returns (return_id, reason, status, created_at, processed_at, notes, approved_at, rejected_at, supplier_id) FROM stdin;
3	damaged	Approved	2026-04-06 16:43:12.705736	\N	\N	2026-04-06 17:16:41.181198	\N	4
7	CANOLA OIL	Approved	2026-04-06 17:19:40.637063	\N	\N	2026-04-06 17:20:22.930613	\N	6
4	CANOLA OIL	Rejected	2026-04-06 17:18:11.339341	\N	\N	\N	2026-04-06 17:20:26.365089	1
8	DAMAGED	Approved	2026-04-06 17:20:53.619378	\N	\N	2026-04-06 17:21:58.248938	\N	2
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (product_id, category_id, supplier_id, product_name, unit_price, sku, date_added, unit_of_measurement, specific_category, pos_price, status, image_url) FROM stdin;
1	1	3	YAMALUBE BLUE CORE 1L	309.00	L-YA-BC1L	2026-04-06	Liter	Engine Oil	365.00	Active	\N
2	1	3	YAMALUBE AT 800ML	234.00	L-YA-AT8M	2026-04-06	Milliliter	Engine Oil	285.00	Active	\N
3	1	6	YAMALUBE GEAR OIL 100ML	61.00	L-YA-GO1M	2026-04-06	Milliliter	Gear Oil	95.00	Active	\N
4	1	1	HONDA GOLD 1L	260.00	L-HO-GL1L	2026-04-06	Liter	Engine Oil	295.00	Active	\N
5	1	1	HONDA BLUE SCT 800ML	300.00	L-HO-BS8M	2026-04-06	Milliliter	Engine Oil	340.00	Active	\N
6	1	1	HONDA BLUE 1L	325.00	L-HO-BL1L	2026-04-06	Liter	Engine Oil	375.00	Active	\N
7	1	3	HONDA RED 1L	238.00	L-HO-RE1L	2026-04-06	Liter	Engine Oil	275.00	Active	\N
8	1	1	HONDA GEAR OIL	70.00	L-HO-GEO	2026-04-06	Liter	Gear Oil	95.00	Active	\N
9	1	3	YAMALUBE PERFORMANCE 1L	275.00	L-YA-PE1L	2026-04-06	Liter	Engine Oil	315.00	Active	\N
10	1	3	YAMALUBE BUSINESS 1L	290.00	L-YA-BU1L	2026-04-06	Liter	Engine Oil	320.00	Active	\N
11	1	3	WD-40 333ML	88.00	L-WD-3M	2026-04-06	Milliliter	Penetrant	\N	Archived	\N
12	1	3	TOP 1 HIGH TEMP GREASE	20.00	L-TO-1HG	2026-04-06	Liter	Grease	35.00	Active	\N
13	1	2	GREASE HIGH TEMP KOBY	7.00	L-GR-HTK	2026-04-06	Liter	Grease	30.00	Active	\N
14	1	3	GASKET MAKER PITSTOP 30G	70.00	L-GA-MP3G	2026-04-06	Milliliter	Gasket Maker	\N	Archived	\N
15	1	6	CVT CLEANER RS8	98.00	L-CV-CL8R	2026-04-06	Milliliter	Cleaner	150.00	Active	\N
16	1	3	CVT FI CLEANER PRO 450ML	1.00	L-CV-FC4M	2026-04-06	Milliliter	Cleaner	\N	Archived	\N
17	1	3	FORK OIL GENERIC	35.50	L-FO-OIG	2026-04-06	Milliliter	Fork Oil	90.00	Active	\N
18	3	2	FUEL FILTER AEROX 155	33.00	A-FU-FA1	2026-04-06	Piece	Fuel Filter	110.00	Active	\N
19	3	2	FUEL FILTER CLICK XRM	33.00	A-FU-FCX	2026-04-06	Piece	Fuel Filter	100.00	Active	\N
20	3	2	OIL FILTER BAJAJ	30.00	A-OI-FIB	2026-04-06	Piece	Oil Filter	50.00	Active	\N
21	3	3	OIL FILTER YAMAHA	30.00	A-OI-FIY	2026-04-06	Piece	Oil Filter	50.00	Active	\N
22	3	2	OIL FILTER KAWASAKI	30.00	A-OI-FIK	2026-04-06	Piece	Oil Filter	50.00	Active	\N
23	3	2	OIL FILTER HJLX	30.00	A-OI-FIH	2026-04-06	Piece	Oil Filter	50.00	Active	\N
24	3	2	OIL FILTER LOFILTRO HF183	30.00	A-OI-FL1H	2026-04-06	Piece	Oil Filter	50.00	Active	\N
25	3	2	OIL FILTER VIC C-806	30.00	A-OI-FV8C	2026-04-06	Piece	Oil Filter	50.00	Active	\N
26	2	2	HEAD LIGHT BULB MAKOTO	12.00	S-HE-LBM	2026-04-06	Piece	Light Bulb	25.00	Active	\N
27	2	2	BEARING KOYO 6004	25.00	S-BE-KO6	2026-04-06	Piece	Bearing	120.00	Active	\N
28	\N	\N	MOTUL SCT 800ML	289.00	PRD-MO-SC8M	2026-04-06	pcs	\N	330.00	Active	\N
29	\N	\N	MOTUL GP MATIC 1L	325.00	PRD-MO-GM1L	2026-04-06	pcs	\N	380.00	Active	\N
30	4	\N	ZIC M9 800ML	251.23	O-ZI-M98M	2026-04-06	Piece	Others	299.00	Active	\N
31	4	\N	ZIC M9 1L	287.12	O-ZI-M91L	2026-04-06	Piece	Others	326.00	Active	\N
32	4	\N	CASTROL ACTIV 1L	290.00	O-CA-AC1L	2026-04-06	Piece	Others	320.00	Active	\N
33	4	\N	SUZUKI ECSTAR 1L	261.00	O-SU-EC1L	2026-04-06	Piece	Others	290.00	Active	\N
34	4	\N	SHELL ADVANCE AX7 800ML	241.74	O-SH-AA8M	2026-04-06	Piece	Others	285.00	Active	\N
35	4	\N	SHELL ADVANCE AX5 4T 800ML	197.88	O-SH-AA8M-001	2026-04-06	Piece	Others	230.00	Active	\N
36	4	\N	TOP 1 GREEN ACTION MATIC 800ML	310.00	O-TO-1G8M	2026-04-06	Piece	Others	350.00	Active	\N
37	4	\N	TOP 1 GREEN ACTION MATIC 1L	340.00	O-TO-1G1L	2026-04-06	Piece	Others	390.00	Active	\N
38	4	\N	TOP 1 VIOLET MC 800ML	290.00	O-TO-1V8M	2026-04-06	Piece	Others	320.00	Active	\N
39	4	\N	TOP 1 VIOLET MC 1L	300.00	O-TO-1V1L	2026-04-06	Piece	Others	360.00	Active	\N
40	4	\N	PETRON MULTI-GRADE 800ML	160.00	O-PE-MU8M	2026-04-06	Piece	Others	200.00	Active	\N
41	4	\N	PETRON SR200 1L	200.00	O-PE-SR1L	2026-04-06	Piece	Others	250.00	Active	\N
42	2	\N	BEARING KOYO 6005	80.00	S-BE-KO6-001	2026-04-06	Piece	Bearing	250.00	Active	\N
43	2	\N	BEARING KOYO 6200	80.00	S-BE-KO6-002	2026-04-06	Piece	Bearing	120.00	Active	\N
44	2	\N	BEARING KOYO 6201	80.00	S-BE-KO6-003	2026-04-06	Piece	Bearing	120.00	Active	\N
45	2	\N	BEARING KOYO 6202	80.00	S-BE-KO6-004	2026-04-06	Piece	Bearing	120.00	Active	\N
46	2	\N	BEARING KOYO 6203	80.00	S-BE-KO6-005	2026-04-06	Piece	Bearing	120.00	Active	\N
47	2	\N	BEARING KOYO 6204	80.00	S-BE-KO6-006	2026-04-06	Piece	Bearing	150.00	Active	\N
48	2	\N	BEARING KOYO 6205	80.00	S-BE-KO6-007	2026-04-06	Piece	Bearing	120.00	Active	\N
49	2	\N	BEARING KOYO 6300	80.00	S-BE-KO6-008	2026-04-06	Piece	Bearing	120.00	Active	\N
50	2	\N	BEARING KOYO 6301	80.00	S-BE-KO6-009	2026-04-06	Piece	Bearing	120.00	Active	\N
51	2	\N	BEARING KOYO 6302	80.00	S-BE-KO6-010	2026-04-06	Piece	Bearing	120.00	Active	\N
52	2	\N	BEARING NSK 6200	75.00	S-BE-NS6	2026-04-06	Piece	Bearing	110.00	Active	\N
53	2	\N	BEARING NSK 6302	75.00	S-BE-NS6-001	2026-04-06	Piece	Bearing	110.00	Active	\N
54	2	\N	BEARING NSK 6004	75.00	S-BE-NS6-002	2026-04-06	Piece	Bearing	110.00	Active	\N
55	2	\N	BEARING KSR 6200	75.00	S-BE-KS6	2026-04-06	Piece	Bearing	110.00	Active	\N
56	2	\N	BEARING KSR 6204	75.00	S-BE-KS6-001	2026-04-06	Piece	Bearing	110.00	Active	\N
57	4	\N	KSR 6004	75.00	O-KS-6	2026-04-06	Piece	Others	110.00	Active	\N
58	4	\N	KSR 6005	75.00	O-KS-6-001	2026-04-06	Piece	Others	110.00	Active	\N
59	1	\N	OIL FILTER SUZUKI	30.00	L-OI-FIS	2026-04-06	Bottle	Engine Oil	50.00	Active	\N
60	2	\N	TAIL LIGHT BULB MAKOTO	12.00	S-TA-LBM	2026-04-06	Piece	Light Bulb	25.00	Active	\N
61	2	\N	SPARK PLUG NGK C6HSA	85.00	S-SP-PN6C	2026-04-06	Piece	Spark Plug	120.00	Active	\N
62	2	\N	SPARK PLUG NGK C7HSA	85.80	S-SP-PN7C	2026-04-06	Piece	Spark Plug	120.00	Active	\N
63	2	\N	SPARK PLUG NGK CPR6EA-9	92.00	S-SP-PN6C-001	2026-04-06	Piece	Spark Plug	130.00	Active	\N
64	2	\N	SPARK PLUG DENSO U24ES-N	109.90	S-SP-PD2U	2026-04-06	Piece	Spark Plug	130.00	Active	\N
65	2	\N	SPARK PLUG DENSO W22FS-US	90.00	S-SP-PD2W	2026-04-06	Piece	Spark Plug	180.00	Active	\N
66	2	\N	SPARK PLUG DENSO W24ES-US	70.00	S-SP-PD2W-001	2026-04-06	Piece	Spark Plug	120.00	Active	\N
67	2	\N	SPARK PLUG DENSO X20FS-U	69.90	S-SP-PD2X	2026-04-06	Piece	Spark Plug	120.00	Active	\N
68	2	\N	SPARK PLUG DENSO X24ES-U	73.80	S-SP-PD2X-001	2026-04-06	Piece	Spark Plug	120.00	Active	\N
69	2	\N	R8 TIRE SEALANT	60.00	S-R8-TIS	2026-04-06	Piece	Tire	100.00	Active	\N
70	2	\N	TIRE SEALANT KOBY	70.00	S-TI-SEK	2026-04-06	Piece	Tire	125.00	Active	\N
71	1	\N	BRAKE FLUID DOT3 NATIONAL	60.00	L-BR-FDN	2026-04-06	Bottle	Engine Oil	100.00	Active	\N
72	2	\N	PEANUT BULB ORANGE	1.50	S-PE-BUO	2026-04-06	Piece	Light Bulb	10.00	Active	\N
73	2	\N	PEANUT BULB WHITE	5.00	S-PE-BUW	2026-04-06	Piece	Light Bulb	15.00	Active	\N
74	4	\N	DOMINO SWITCH	30.00	O-DO-S	2026-04-06	Piece	Others	120.00	Active	\N
75	4	\N	STARTER SWITCH	10.00	O-ST-S	2026-04-06	Piece	Others	20.00	Active	\N
76	2	\N	BRAKE SWITCH L	10.00	S-BR-SWL	2026-04-06	Set	Brake Shoe	25.00	Active	\N
77	2	\N	BRAKE SWITCH R	4.00	S-BR-SWR	2026-04-06	Set	Brake Shoe	20.00	Active	\N
78	4	\N	ON/OFF SWITCH	10.00	O-ON-S	2026-04-06	Piece	Others	20.00	Active	\N
79	4	\N	HORN SWITCH	30.00	O-HO-S	2026-04-06	Piece	Others	50.00	Active	\N
80	4	\N	HAZARD SWITCH	30.00	O-HA-S	2026-04-06	Piece	Others	50.00	Active	\N
81	4	\N	H/L SWITCH	30.00	O-H/-S	2026-04-06	Piece	Others	50.00	Active	\N
82	4	\N	HOLLOW SWITCH	20.00	O-HO-S-001	2026-04-06	Piece	Others	50.00	Active	\N
83	4	\N	L/R SWITCH	20.00	O-L/-S	2026-04-06	Piece	Others	50.00	Active	\N
84	4	\N	NITTO ELECTRICAL TAPE	25.00	O-NI-ELT	2026-04-06	Piece	Others	50.00	Active	\N
85	4	\N	PITO	7.00	O-PI	2026-04-06	Piece	Others	50.00	Active	\N
86	4	\N	FUEL HOSE RED per feet	10.00	O-FU-HRF	2026-04-06	Piece	Others	30.00	Active	\N
87	4	\N	FUEL HOSE BLACK PER FT	25.00	O-FU-HBF	2026-04-06	Piece	Others	50.00	Active	\N
88	4	\N	ALLEN BOLT	2.00	O-AL-B	2026-04-06	Piece	Others	10.00	Active	\N
89	4	\N	HORN RELAY	40.00	O-HO-R	2026-04-06	Piece	Others	100.00	Active	\N
90	4	\N	FLASHER RELAY (PAG)	53.00	O-FL-REP	2026-04-06	Piece	Others	100.00	Active	\N
91	2	\N	YAMAHA BELT 2DP-E7641-00	289.00	S-YA-BE2D	2026-04-06	Piece	Drive Belt	850.00	Active	\N
92	2	\N	HONDA BELT / CLICK 23100-K35-V01	338.00	S-HO-B/2K	2026-04-06	Piece	Drive Belt	850.00	Active	\N
93	2	\N	JVT FLYBALL 15G - PCX/CLICK/ADV	297.77	S-JV-F1P	2026-04-06	Set	Flyball	550.00	Active	\N
94	2	\N	YAKIMOTO FLYBALL 10G - MIO125	200.00	S-YA-F11M	2026-04-06	Set	Flyball	300.00	Active	\N
95	1	\N	FORK OIL SEAL	60.00	L-FO-OIS	2026-04-06	Bottle	Fork Oil	120.00	Active	\N
96	2	\N	BRAKE PAD YAMAKOTO SHOGUN 125	33.00	S-BR-PY1	2026-04-06	Set	Brake Pad	150.00	Active	\N
97	2	\N	BRAKE PAD YAMAKOTO CLICK125/150	33.00	S-BR-PY1C	2026-04-06	Set	Brake Pad	100.00	Active	\N
98	2	\N	BRAKE PAD YAMAKOTO BEAT	30.00	S-BR-PYB	2026-04-06	Set	Brake Pad	100.00	Active	\N
99	2	\N	BRAKE PAD - RAIDER 150	30.00	S-BR-P-1	2026-04-06	Set	Brake Pad	250.00	Active	\N
100	4	\N	HORN RELAY 4 PIN TRANSPARENT	49.00	O-HO-R4T	2026-04-06	Piece	Others	100.00	Active	\N
101	4	\N	HORN RELAY 5 PIN TRANSPARENT	59.00	O-HO-R5T	2026-04-06	Piece	Others	100.00	Active	\N
102	4	\N	FUSE 10A	2.00	O-FU-1A	2026-04-06	Piece	Others	10.00	Active	\N
103	4	\N	FUSE 15A	2.00	O-FU-1A-001	2026-04-06	Piece	Others	10.00	Active	\N
104	4	\N	GLASS FUSE - 15A	2.00	O-GL-F-1A	2026-04-06	Piece	Others	10.00	Active	\N
105	4	\N	CHAIN LOCK 428H	3.28	O-CH-LO4H	2026-04-06	Piece	Others	25.00	Active	\N
106	4	\N	CORSA CROSS S 90/90-14	1497.20	O-CO-CS9	2026-04-06	Piece	Others	1796.64	Active	\N
107	4	\N	CORSA CROSS S 100/80-14	1694.80	O-CO-CS1	2026-04-06	Piece	Others	2033.76	Active	\N
108	4	\N	CORSA CROSS S 110/80-14	1869.60	O-CO-CS1-001	2026-04-06	Piece	Others	2243.52	Active	\N
109	4	\N	CORSA CROSS S 70/90-17	1322.40	O-CO-CS7	2026-04-06	Piece	Others	1586.28	Active	\N
110	4	\N	CORSA CROSS S 100/80-17	2196.40	O-CO-CS1-002	2026-04-06	Piece	Others	2635.68	Active	\N
111	4	\N	CORSA R26 100/80-14	1862.00	O-CO-R21	2026-04-06	Piece	Others	2234.40	Active	\N
112	4	\N	CORSA S33 80/80-14	1194.00	O-CO-S38	2026-04-06	Piece	Others	1440.00	Active	\N
113	4	\N	CORSA R26 80/80-14	1333.80	O-CO-R28	2026-04-06	Piece	Others	1600.56	Active	\N
114	4	\N	CORSA R26 90/80-14	1592.20	O-CO-R29	2026-04-06	Piece	Others	1900.00	Active	\N
115	4	\N	WASHER 10	1.00	O-WA-1	2026-04-06	Piece	Others	2.00	Active	\N
116	4	\N	WASHER 12	1.00	O-WA-1-001	2026-04-06	Piece	Others	2.00	Active	\N
117	4	\N	WASHER 14	1.00	O-WA-1-002	2026-04-06	Piece	Others	2.00	Active	\N
118	4	\N	YUNXIN O-RING 1	10.00	O-YU-O-1	2026-04-06	Piece	Others	20.00	Active	\N
119	4	\N	YUNXIN O-RING 3	5.00	O-YU-O-3	2026-04-06	Piece	Others	25.00	Active	\N
120	4	\N	CLUTCH CABLE TMX	51.00	O-CL-CAT	2026-04-06	Piece	Others	150.00	Active	\N
121	4	\N	EXHAUST GASKET	5.00	O-EX-G	2026-04-06	Piece	Others	20.00	Active	\N
122	4	\N	PASAK	10.00	O-PA	2026-04-06	Piece	Others	40.00	Active	\N
123	4	\N	FLARINGS SCREW	8.00	O-FL-S	2026-04-06	Piece	Others	12.00	Active	\N
124	4	\N	RUBBER DUMPER (SNIPER)	90.00	O-RU-DUS	2026-04-06	Piece	Others	150.00	Active	\N
125	2	\N	FUEL FILTER UNIVERSAL	10.00	S-FU-FIU	2026-04-06	Piece	Fuel Filter	50.00	Active	\N
126	4	\N	ABETA GREY	90.00	O-AB-G	2026-04-06	Piece	Others	150.00	Active	\N
127	2	\N	YAMAHA GENUINE BRAKE PADS 2DP-F5805-00	160.00	S-YA-GB2D	2026-04-06	Set	Brake Pad	250.00	Active	\N
128	1	\N	PLATINUM FORK OIL 200ML	27.74	L-PL-FO2M	2026-04-06	Bottle	Fork Oil	90.00	Active	\N
129	4	\N	CP HOLDER	118.00	O-CP-H	2026-04-06	Piece	Others	250.00	Active	\N
130	4	\N	SPARKO 1101 LIQUID GASKET	18.50	O-SP-1LG	2026-04-06	Piece	Others	24.05	Active	\N
131	4	\N	SIDE MIRROR ADAPTOR HONDA	5.00	O-SI-MAH	2026-04-06	Piece	Others	30.00	Active	\N
132	4	\N	GRASA KOBY	6.15	O-GR-K	2026-04-06	Piece	Others	30.00	Active	\N
133	4	\N	ELECTRICAL TAPE	25.00	O-EL-T	2026-04-06	Piece	Others	50.00	Active	\N
134	4	\N	WASHER	1.00	O-WA	2026-04-06	Piece	Others	5.00	Active	\N
135	2	\N	BRAKE PAD M3	26.00	S-BR-PA3M	2026-04-06	Set	Brake Pad	150.00	Active	\N
136	1	\N	COOLANT	75.00	L-CO	2026-04-06	Bottle	Engine Oil	120.00	Active	\N
137	4	\N	REPAIR KIT	25.00	O-RE-K	2026-04-06	Piece	Others	100.00	Active	\N
138	2	\N	TAIL LIGHT BULB	13.40	S-TA-LIB	2026-04-06	Piece	Light Bulb	25.00	Active	\N
139	2	\N	HEAD LIGHT BULB	13.40	S-HE-LIB	2026-04-06	Piece	Light Bulb	25.00	Active	\N
140	2	\N	TIRE SEALANT KHC	45.00	S-TI-SEK-001	2026-04-06	Piece	Tire	100.00	Active	\N
141	4	\N	THROTTLE CABLE	38.00	O-TH-C	2026-04-06	Piece	Others	150.00	Active	\N
142	4	\N	STAINLESS SCREW WITH WASHER	7.00	O-ST-SWW	2026-04-06	Piece	Others	15.00	Active	\N
143	4	\N	O-RING	16.50	O-O-	2026-04-06	Piece	Others	50.00	Active	\N
144	2	\N	BRAKE PAD HONDA B6H	95.00	S-BR-PH6B	2026-04-06	Set	Brake Pad	200.00	Active	\N
145	4	\N	HORN SOCKET	8.00	O-HO-S-002	2026-04-06	Piece	Others	10.00	Active	\N
146	4	\N	HORN HELLA	238.00	O-HO-H	2026-04-06	Piece	Others	309.40	Active	\N
147	4	\N	STARTER RELAY MIO	145.00	O-ST-REM	2026-04-06	Piece	Others	300.00	Active	\N
148	2	\N	BRAKE PAD YAMAKOTO	24.00	S-BR-PAY	2026-04-06	Set	Brake Pad	120.00	Active	\N
149	4	\N	BALL RACE GEAR/GRAVIS	150.00	O-BA-RAG	2026-04-06	Piece	Others	195.00	Active	\N
150	4	\N	TTGR REGULATOR RUSI	220.00	O-TT-RER	2026-04-06	Piece	Others	286.00	Active	\N
151	4	\N	FUSE BOX WITH FUSE	9.20	O-FU-BWF	2026-04-06	Piece	Others	50.00	Active	\N
152	2	\N	AIR FILTER CLICK125	79.00	S-AI-FI1C	2026-04-06	Piece	Air Filter	200.00	Active	\N
153	2	\N	AIR FILTER AEROX V1	105.00	S-AI-FA1V	2026-04-06	Piece	Air Filter	136.50	Active	\N
154	2	\N	BRAKE MASTER REPAIR KIT XRM	17.00	S-BR-MRX	2026-04-06	Set	Brake Shoe	100.00	Active	\N
155	4	\N	THROTTLE CABLE OTAKA	41.00	O-TH-CAO	2026-04-06	Piece	Others	53.30	Active	\N
156	4	\N	CDI LIFAN 4 PIN HONGXIN	113.00	O-CD-L4H	2026-04-06	Piece	Others	146.90	Active	\N
157	4	\N	RUBBER DUMPER WAVE 125	30.00	O-RU-DW1	2026-04-06	Piece	Others	39.00	Active	\N
158	2	\N	BRAKE SHOE HONDA CLICK V1 GENUINE	225.00	S-BR-SHG	2026-04-06	Set	Brake Shoe	350.00	Active	\N
159	4	\N	SIDE MIRROR HONDA	106.00	O-SI-MIH	2026-04-06	Piece	Others	190.00	Active	\N
160	4	\N	HORN BOSCH 190	190.00	O-HO-BO1	2026-04-06	Piece	Others	250.00	Active	\N
161	4	\N	FUEL HOSE GREY PER FOOT	13.20	O-FU-HGF	2026-04-06	Piece	Others	25.00	Active	\N
162	4	\N	RACING CARBURETOR KEIHIN 28MM	680.00	O-RA-CK2M	2026-04-06	Piece	Others	950.00	Active	\N
163	2	\N	BRAKE MASTER MRP SKYDRIVE125	180.00	S-BR-MM1S	2026-04-06	Set	Brake Shoe	234.00	Active	\N
164	2	\N	BRAKE MASTER BEAT BEAT FI	49.40	S-BR-MBF	2026-04-06	Set	Brake Shoe	64.22	Active	\N
165	4	\N	HEAD LIGHT LED SUPER BRIGHT T19 WHITE	79.00	O-HE-LLW	2026-04-06	Piece	Others	150.00	Active	\N
166	4	\N	HEAD LIGHT LED SUPER BRIGHT MDL KILLER	105.00	O-HE-LLK	2026-04-06	Piece	Others	250.00	Active	\N
167	4	\N	BOLT MUSHROOM TYPE 5X15 SILVER	20.00	O-BO-MTS	2026-04-06	Piece	Others	26.00	Active	\N
168	4	\N	BOLT MUSHROOM TYPE 5X15 TITANIUM	22.00	O-BO-MTT	2026-04-06	Piece	Others	28.60	Active	\N
169	4	\N	BOLT MUSHROOM TYPE 5X15 GOLD	20.00	O-BO-MTG	2026-04-06	Piece	Others	26.00	Active	\N
170	2	\N	SPARK PLUG DENSO U22FS-U	61.90	S-SP-PD2U-001	2026-04-06	Piece	Spark Plug	120.00	Active	\N
171	4	\N	PARK LIGHT T15 PAIR WHITE	62.00	O-PA-LTW	2026-04-06	Piece	Others	80.60	Active	\N
172	4	\N	PARK LIGHT T15 PAIR BLUE	62.00	O-PA-LTB	2026-04-06	Piece	Others	80.60	Active	\N
173	4	\N	PARK LIGHT T15 PAIR YELLOW	62.00	O-PA-LTY	2026-04-06	Piece	Others	80.60	Active	\N
174	2	\N	BRAKE PAD HONDA CLICK FRONT GENUINE	145.00	S-BR-PHG	2026-04-06	Set	Brake Pad	188.50	Active	\N
175	2	\N	BRAKE PAD HONDA CRF150 REAR	59.00	S-BR-PHR	2026-04-06	Set	Brake Pad	76.70	Active	\N
176	2	\N	BRAKE SHOE MTR CLICK	99.00	S-BR-SMC	2026-04-06	Set	Brake Shoe	150.00	Active	\N
177	1	\N	OIL SEAL PULLEY SIDE NMAX/AEROX	42.00	L-OI-SPN	2026-04-06	Bottle	Engine Oil	54.60	Active	\N
178	4	\N	BODY CLIP WITH BOLT	2.00	O-BO-CWB	2026-04-06	Piece	Others	2.60	Active	\N
179	4	\N	SLIDER PIECE HONDA CLICK PCX ADV	60.00	O-SL-PHA	2026-04-06	Piece	Others	78.00	Active	\N
180	4	\N	FUSE	1.76	O-FU	2026-04-06	Piece	Others	10.00	Active	\N
181	4	\N	STARTER RELAY XR200	188.00	O-ST-RE2X	2026-04-06	Piece	Others	244.40	Active	\N
182	2	\N	BRAKE PAD YAMAHA MIO SPORTY F	95.00	S-BR-PYF	2026-04-06	Set	Brake Pad	123.50	Active	\N
183	2	\N	BRAKE PAD YAMAHA AEROX F	95.00	S-BR-PYF-001	2026-04-06	Set	Brake Pad	123.50	Active	\N
184	2	\N	BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX	70.00	S-BR-MRA	2026-04-06	Set	Brake Shoe	91.00	Active	\N
185	2	\N	BRAKE SWITCH UNIVERSAL	4.00	S-BR-SWU	2026-04-06	Set	Brake Shoe	30.00	Active	\N
186	4	\N	PEANUT BULT T13 UNIVERSAL WHITE	3.00	O-PE-BTW	2026-04-06	Piece	Others	3.90	Active	\N
187	4	\N	PEANUT BULT T13 UNIVERSAL ORANGE	3.00	O-PE-BTO	2026-04-06	Piece	Others	10.00	Active	\N
188	4	\N	FUEL PUMP FLOATER HONDA BEAT	269.00	O-FU-PFB	2026-04-06	Piece	Others	349.70	Active	\N
189	4	\N	AUTO WIRE #18 JAPAN PER METER	8.00	O-AU-W#M	2026-04-06	Piece	Others	25.00	Active	\N
190	4	\N	OVERHAUL GASKET SET CB400	387.50	O-OV-GS4C	2026-04-06	Piece	Others	503.75	Active	\N
191	4	\N	CLUTCH CABLE CB400	239.00	O-CL-CA4C	2026-04-06	Piece	Others	310.70	Active	\N
192	4	\N	CARBURETOR DIAPHRAGM CB400 SET	162.00	O-CA-DCS	2026-04-06	Piece	Others	210.60	Active	\N
193	4	\N	CARBON BRUSH WAVE 125	83.00	O-CA-BW1	2026-04-06	Piece	Others	107.90	Active	\N
194	4	\N	FUEL PUMP O-RING BEAT	55.00	O-FU-POB	2026-04-06	Piece	Others	71.50	Active	\N
195	4	\N	REGULATOR RECTIFIER SKYDRIVE CARB	118.00	O-RE-RSC	2026-04-06	Piece	Others	153.40	Active	\N
196	4	\N	GEAR BOX YAMAHA 5TL MIO	98.00	O-GE-BYM	2026-04-06	Piece	Others	127.40	Active	\N
197	1	\N	OIL FILTER YAMAHA P12	12.00	L-OI-FY1P	2026-04-06	Bottle	Engine Oil	50.00	Active	\N
198	2	\N	BRAKE CABLE CLICK 125 RR MAKOTO	150.00	S-BR-CCM	2026-04-06	Set	Brake Shoe	195.00	Active	\N
199	4	\N	FUEL PUMP ASSEMBLY HONDA BEAT FI	1188.00	O-FU-PAF	2026-04-06	Piece	Others	1544.40	Active	\N
200	4	\N	FUEL COCK CB400	705.00	O-FU-CO4C	2026-04-06	Piece	Others	916.50	Active	\N
201	1	\N	OIL SEAL AXLE DRIVE MIO	60.00	L-OI-SAM	2026-04-06	Bottle	Engine Oil	78.00	Active	\N
202	2	\N	AIR FILTER YAMAHA MIO GRAVIS GEAR	100.00	S-AI-FYG	2026-04-06	Piece	Air Filter	130.00	Active	\N
203	2	\N	AIR FILTER PCX ADV	145.00	S-AI-FPA	2026-04-06	Piece	Air Filter	200.00	Active	\N
204	2	\N	BELT YAMAHA 5TL MIO SPORTY NOVO	244.00	S-BE-Y5N	2026-04-06	Piece	Drive Belt	650.00	Active	\N
205	2	\N	BRAKE PAD YAMAKOTO RAIDER 150 FI F	30.00	S-BR-PYF-002	2026-04-06	Set	Brake Pad	100.00	Active	\N
206	2	\N	BRAKE PAD YAMAKOTO RAIDER 150 FI R	30.00	S-BR-PYR	2026-04-06	Set	Brake Pad	100.00	Active	\N
207	2	\N	BRAKE PAD YAMAKOTO PCX	30.00	S-BR-PYP	2026-04-06	Set	Brake Pad	100.00	Active	\N
208	2	\N	BRAKE PAD YAMAKOTO MIO M3	30.00	S-BR-PY3M	2026-04-06	Set	Brake Pad	150.00	Active	\N
209	2	\N	BALLRACE BEARING YAMAHA MIO	315.00	S-BA-BYM	2026-04-06	Piece	Bearing	409.50	Active	\N
210	2	\N	BALLRACE BEARING KRYON CLICK	100.00	S-BA-BKC	2026-04-06	Piece	Bearing	350.00	Active	\N
211	2	\N	BRAKE PAD YAMAHA SNIPER R	160.00	S-BR-PYR-001	2026-04-06	Set	Brake Pad	208.00	Active	\N
212	2	\N	BELT HONDA BEAT FI	300.00	S-BE-HBF	2026-04-06	Piece	Drive Belt	390.00	Active	\N
213	4	\N	ELECTRICAL TAPE NITTO 33	33.00	O-EL-TN3	2026-04-06	Piece	Others	50.00	Active	\N
214	2	\N	BRAKE PAD YAMAHA SNIPER F	95.00	S-BR-PYF-003	2026-04-06	Set	Brake Pad	123.50	Active	\N
215	2	\N	BRAKE SHOE OTAKA BEAT	94.00	S-BR-SOB	2026-04-06	Set	Brake Shoe	122.20	Active	\N
216	2	\N	BRAKE SHOE OTAKA MIO	104.00	S-BR-SOM	2026-04-06	Set	Brake Shoe	220.00	Active	\N
217	4	\N	CLUTCH CABLE OTAKA BARAKO	51.00	O-CL-COB	2026-04-06	Piece	Others	66.30	Active	\N
218	4	\N	THROTTLE CABLE OTAKA TMX155	41.00	O-TH-CO1T	2026-04-06	Piece	Others	53.30	Active	\N
219	2	\N	BELT HONDA PCX ADV CLICK 160	390.00	S-BE-HP1	2026-04-06	Piece	Drive Belt	850.00	Active	\N
220	2	\N	FUEL FILTER BEAT	33.00	S-FU-FIB	2026-04-06	Piece	Fuel Filter	42.90	Active	\N
221	4	\N	CLUTCH CABLE BARAKO	29.00	O-CL-CAB	2026-04-06	Piece	Others	100.00	Active	\N
222	2	\N	BRAKE MASTER REPAIR KIT BEAT	20.00	S-BR-MRB	2026-04-06	Set	Brake Shoe	100.00	Active	\N
223	2	\N	BRAKE MASTER REPAIR KIT CLICK	20.00	S-BR-MRC	2026-04-06	Set	Brake Shoe	100.00	Active	\N
224	2	\N	BRAKE PAD YAMAKOTO XRM	30.00	S-BR-PYX	2026-04-06	Set	Brake Pad	100.00	Active	\N
225	2	\N	BRAKE MASTER REPAIR KIT HONDA BEAT	40.00	S-BR-MRB-001	2026-04-06	Set	Brake Shoe	100.00	Active	\N
226	4	\N	CARBURETOR RUBBER HOSE	186.00	O-CA-RUH	2026-04-06	Piece	Others	241.80	Active	\N
227	2	\N	AIR FILTER KLX140	220.00	S-AI-FI1K	2026-04-06	Piece	Air Filter	286.00	Active	\N
228	4	\N	RUBBER DUMPER KHC XRM	28.00	O-RU-DKX	2026-04-06	Piece	Others	80.00	Active	\N
229	4	\N	RUBBER DUMPER KHC WAVE125	30.00	O-RU-DK1W	2026-04-06	Piece	Others	80.00	Active	\N
230	4	\N	STARTER RELAY TMX125 RUSI	99.00	O-ST-RTR	2026-04-06	Piece	Others	200.00	Active	\N
231	4	\N	BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO	150.00	O-BA-SUG	2026-04-06	Piece	Others	300.00	Active	\N
232	2	\N	BRAKE PAD YAMAKOTO SHOGUN F	24.00	S-BR-PYF-004	2026-04-06	Set	Brake Pad	100.00	Active	\N
233	4	\N	CABLE TIE	1.00	O-CA-T	2026-04-06	Piece	Others	2.00	Active	\N
234	4	\N	CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK	951.00	O-CL-SO3M	2026-04-06	Piece	Others	1170.00	Active	\N
235	2	\N	FLYBALL JVT CLICK/PCX/ADV 13G	297.77	S-FL-JC1G	2026-04-06	Set	Flyball	550.00	Active	\N
236	2	\N	FLYBALL JVT CLICK/PCX/ADV 19G	297.77	S-FL-JC1G-001	2026-04-06	Set	Flyball	550.00	Active	\N
237	4	\N	SLIDER PIECE JVT CLICK/PCX/ADV	79.19	O-SL-PJC	2026-04-06	Piece	Others	200.00	Active	\N
238	2	\N	FLYBALL CWORKS NMAX/AEROX/M3 12G	256.50	S-FL-CN1G	2026-04-06	Set	Flyball	333.45	Active	\N
239	2	\N	FLYBALL CWORKS BEAT FI/GY6 13G	247.50	S-FL-CB1G	2026-04-06	Set	Flyball	321.75	Active	\N
240	2	\N	FLYBALL CWORKS CLICK/PCX/ADV 13G	256.50	S-FL-CC1G	2026-04-06	Set	Flyball	380.00	Active	\N
241	2	\N	SPARK PLUG CAP CWORKS NMAX V-TYPE	234.00	S-SP-PCV	2026-04-06	Piece	Spark Plug	304.20	Active	\N
242	2	\N	SPARK PLUG CAP CWORKS PCX/ADV L-TYPE	234.00	S-SP-PCL	2026-04-06	Piece	Spark Plug	350.00	Active	\N
243	4	\N	FALCON VIPER 6160 90/90-14 TL	934.80	O-FA-V6T	2026-04-06	Piece	Others	1230.00	Active	\N
244	4	\N	FALCON VIPER SPEED 90/80-14 TL	776.99	O-FA-VST	2026-04-06	Piece	Others	1165.00	Active	\N
245	4	\N	FALCON VIPER EXTREME 110/80/14 TL	1134.40	O-FA-VET	2026-04-06	Piece	Others	1474.72	Active	\N
246	4	\N	FALCON VIPER EXTREME 90/80/14 TL	885.40	O-FA-VET-001	2026-04-06	Piece	Others	1151.02	Active	\N
247	4	\N	FALCON VIPER EXTREME 100/80/14 TL	1026.00	O-FA-VET-002	2026-04-06	Piece	Others	1333.80	Active	\N
248	4	\N	CVT FI CLEANER PRO PROTECTOR 450ML	90.00	O-CV-FC4M	2026-04-06	Piece	Others	150.00	Active	\N
249	4	\N	CORSA 110/70-13 M5	1793.60	O-CO-115M	2026-04-06	Piece	Others	2331.68	Active	\N
250	4	\N	CORSA 130/70-13 M5	2173.60	O-CO-135M	2026-04-06	Piece	Others	2825.68	Active	\N
251	2	\N	TIRE SEALANT BR	45.00	S-TI-SEB	2026-04-06	Piece	Tire	100.00	Active	\N
252	1	\N	BRAKE FLUID SURE BRAKE	47.00	L-BR-FSB	2026-04-06	Bottle	Engine Oil	90.00	Active	\N
253	1	\N	COOLANT THAI 500ML	75.00	L-CO-TH5M	2026-04-06	Bottle	Engine Oil	120.00	Active	\N
254	4	\N	PETRON MONOGRADE 800ML	153.85	O-PE-MO8M	2026-04-06	Piece	Others	200.00	Active	\N
255	1	\N	GEAR OIL PETRON	61.54	L-GE-OIP	2026-04-06	Bottle	Gear Oil	80.00	Active	\N
256	4	\N	RS8 R9 1L	300.00	O-RS-R91L	2026-04-06	Piece	Others	350.00	Active	\N
257	4	\N	O-RING YAMAHA TORQUE DRIVE	76.92	O-O--YTD	2026-04-06	Piece	Others	100.00	Active	\N
258	4	\N	STEEL BOLT 10MM	3.50	O-ST-BO1M	2026-04-06	Piece	Others	5.00	Active	\N
259	4	\N	CLUTCH LEVER	75.00	O-CL-L	2026-04-06	Piece	Others	100.00	Active	\N
260	4	\N	CLUTCH LINING JVT GRAVIS/MIO	807.69	O-CL-LJG	2026-04-06	Piece	Others	1050.00	Active	\N
261	4	\N	NUT	2.00	O-NU	2026-04-06	Piece	Others	4.00	Active	\N
262	4	\N	BOLT STAINLESS	10.00	O-BO-S	2026-04-06	Piece	Others	15.00	Active	\N
263	4	\N	NUT STAINLESS	10.00	O-NU-S	2026-04-06	Piece	Others	6.00	Active	\N
264	4	\N	NUT STAINLESS 14MM	8.00	O-NU-ST1M	2026-04-06	Piece	Others	15.00	Active	\N
265	4	\N	HEADLIGHT LED 200	105.00	O-HE-LE2	2026-04-06	Piece	Others	200.00	Active	\N
266	4	\N	STEEL NUT	2.00	O-ST-N	2026-04-06	Piece	Others	5.00	Active	\N
267	4	\N	WELDING	0.00	O-WE	2026-04-06	Piece	Others	100.00	Active	\N
268	4	\N	REGULATOR BARAKO	250.00	O-RE-B	2026-04-06	Piece	Others	350.00	Active	\N
269	1	\N	USED OIL 1DRUM	0.00	L-US-OI1D	2026-04-06	Bottle	Engine Oil	2800.00	Active	\N
270	4	\N	SYLVESTER SPRAY PAINT	100.00	O-SY-SPP	2026-04-06	Piece	Others	150.00	Active	\N
271	4	\N	CLUTCH CABLE RAIDER	60.00	O-CL-CAR	2026-04-06	Piece	Others	120.00	Active	\N
272	4	\N	BALLRACE NMAX SUNTAL	180.00	O-BA-NMS	2026-04-06	Piece	Others	350.00	Active	\N
273	2	\N	STAINLESS SCREW FOR BRAKE MASTER	10.00	S-ST-SFM	2026-04-06	Set	Brake Shoe	15.00	Active	\N
274	2	\N	CWORKS SPARK PLUG CUP	234.00	S-CW-SPC	2026-04-06	Piece	Spark Plug	320.00	Active	\N
275	4	\N	DUNLOP D115 70/90-14	980.00	O-DU-D17	2026-04-06	Piece	Others	1400.00	Active	\N
276	2	\N	PEANUT BULB SOCKET	5.00	S-PE-BUS	2026-04-06	Piece	Light Bulb	20.00	Active	\N
277	4	\N	SLIDER PIECE JVT AEROX	88.00	O-SL-PJA	2026-04-06	Piece	Others	200.00	Active	\N
278	4	\N	HANDLE GRIP *	50.00	O-HA-GR	2026-04-06	Piece	Others	150.00	Active	\N
279	1	\N	ACOOLANT	150.00	L-AC	2026-04-06	Bottle	Engine Oil	100.00	Active	\N
280	1	\N	AJVT GEAR OIL	70.00	L-AJ-GEO	2026-04-06	Bottle	Gear Oil	100.00	Active	\N
281	4	\N	PETRON SCT	150.00	O-PE-S	2026-04-06	Piece	Others	195.00	Active	\N
282	4	\N	O-RING CLICK	40.00	O-O--C	2026-04-06	Piece	Others	100.00	Active	\N
283	2	\N	BEE RUBBER TIRE USED	0.00	S-BE-RTU	2026-04-06	Piece	Tire	300.00	Active	\N
284	4	\N	INTERIOR	80.00	O-IN	2026-04-06	Piece	Others	130.00	Active	\N
285	1	\N	OIL SEAL 200	100.00	L-OI-SE2	2026-04-06	Bottle	Engine Oil	200.00	Active	\N
286	4	\N	ASPROCKET TMX 155	80.00	O-AS-TM1	2026-04-06	Piece	Others	135.00	Active	\N
287	4	\N	ENGINE SPROCKET TMX	25.00	O-EN-SPT	2026-04-06	Piece	Others	80.00	Active	\N
288	4	\N	AXLE EHE TMX	100.00	O-AX-EHT	2026-04-06	Piece	Others	180.00	Active	\N
293	4	\N	BATTERY CHARGING	0.00	O-BA-C	2026-04-06	Piece	Others	40.00	Active	\N
294	4	\N	RELAY SOCKET	15.00	O-RE-S	2026-04-06	Piece	Others	40.00	Active	\N
295	4	\N	DID CHAIN 428H	220.00	O-DI-CH4H	2026-04-06	Piece	Others	400.00	Active	\N
296	2	\N	ASPARK PLUG HELLA	60.00	S-AS-PLH	2026-04-06	Piece	Spark Plug	120.00	Active	\N
297	4	\N	CDI 300	230.77	O-CD-3	2026-04-06	Piece	Others	300.00	Active	\N
298	4	\N	STEEL BOLT 12MM	6.00	O-ST-BO1M-001	2026-04-06	Piece	Others	10.00	Active	\N
299	4	\N	CLUTCH SPRING	153.85	O-CL-S	2026-04-06	Piece	Others	200.00	Active	\N
300	4	\N	CARBURETOR REPAIR KIT	100.00	O-CA-REK	2026-04-06	Piece	Others	150.00	Active	\N
301	2	\N	ABRAKE SWITCH FOOT BRAKE	50.00	S-AB-SFB	2026-04-06	Set	Brake Shoe	100.00	Active	\N
302	4	\N	PETRON SC400	226.92	O-PE-4S	2026-04-06	Piece	Others	295.00	Active	\N
303	2	\N	AFLYBALL MTRT MIO	250.00	S-AF-MTM	2026-04-06	Set	Flyball	420.00	Active	\N
304	4	\N	AHEADLIGH SOCET	45.00	O-AH-S	2026-04-06	Piece	Others	90.00	Active	\N
305	4	\N	AREGULATOR LAM9	150.00	O-AR-9L	2026-04-06	Piece	Others	300.00	Active	\N
306	4	\N	AKRX TUBE	60.00	O-AK-T	2026-04-06	Piece	Others	125.00	Active	\N
307	2	\N	ABRAKE PAD CLICK	75.00	S-AB-PAC	2026-04-06	Set	Brake Pad	150.00	Active	\N
308	4	\N	SIGNAL LIGHT LED T15 BLUE	62.00	O-SI-LLB	2026-04-06	Piece	Others	150.00	Active	\N
309	2	\N	BRAKE CABLE 150	115.38	S-BR-CA1	2026-04-06	Set	Brake Shoe	150.00	Active	\N
310	4	\N	AINTERIOR KRX	60.00	O-AI-K	2026-04-06	Piece	Others	125.00	Active	\N
311	2	\N	BRAKE CABLE BARAKO	90.00	S-BR-CAB	2026-04-06	Set	Brake Shoe	150.00	Active	\N
312	2	\N	BALLRACE BEARING M3	269.23	S-BA-BE3M	2026-04-06	Piece	Bearing	350.00	Active	\N
313	2	\N	BRAKE PAD ADV 160	115.38	S-BR-PA1	2026-04-06	Set	Brake Pad	150.00	Active	\N
314	2	\N	BRAKE PAD MIO SPORTY	192.31	S-BR-PMS	2026-04-06	Set	Brake Pad	250.00	Active	\N
315	2	\N	ABEARING KOYO 6303	25.00	S-AB-KO6	2026-04-06	Piece	Bearing	80.00	Active	\N
316	4	\N	CLUTCH LINING	120.00	O-CL-L-001	2026-04-06	Piece	Others	200.00	Active	\N
317	1	\N	ASUN RASING GEAR OIL	60.00	L-AS-RGO	2026-04-06	Bottle	Gear Oil	100.00	Active	\N
318	2	\N	SPARK PLUG CUP OEM	20.00	S-SP-PCO	2026-04-06	Piece	Spark Plug	50.00	Active	\N
319	4	\N	CARBON BRUSH 120	70.00	O-CA-BR1	2026-04-06	Piece	Others	120.00	Active	\N
320	4	\N	CORSA R26 80/80-14 1200	923.08	O-CO-R81	2026-04-06	Piece	Others	1200.00	Active	\N
321	1	\N	OIL SEAL YAMAHA PULLEY SIDE M3	92.31	L-OI-SY3M	2026-04-06	Bottle	Engine Oil	120.00	Active	\N
322	4	\N	ASLIDER PIECE SUN RACING	100.00	O-AS-PSR	2026-04-06	Piece	Others	180.00	Active	\N
323	2	\N	ABRAKE SWITCH UNIVERSAL	10.00	S-AB-SWU	2026-04-06	Set	Brake Shoe	50.00	Active	\N
325	4	\N	CORSA CROSS S 130/70-13	1923.08	O-CO-CS1-003	2026-04-06	Piece	Others	2500.00	Active	\N
326	4	\N	ACARBURETOR CLEANER	60.00	O-AC-C	2026-04-06	Piece	Others	100.00	Active	\N
327	1	\N	ARS8 ENGINE OIL	180.00	L-AR-ENO	2026-04-06	Bottle	Engine Oil	250.00	Active	\N
328	2	\N	BRAKE PAD 150	115.38	S-BR-PA1-001	2026-04-06	Set	Brake Pad	150.00	Active	\N
329	4	\N	HONDA SCT GREY	262.00	O-HO-SCG	2026-04-06	Piece	Others	295.00	Active	\N
330	4	\N	SPROCKET SET	650.00	O-SP-S	2026-04-06	Piece	Others	800.00	Active	\N
331	4	\N	O-RING TORQUE DRIVE 160	123.08	O-O--TD1	2026-04-06	Piece	Others	160.00	Active	\N
332	4	\N	HONDA CARBON CLEANER	40.00	O-HO-CAC	2026-04-06	Piece	Others	80.00	Active	\N
333	1	\N	BRAKE FLUID AEROMOTIVE DOT5	80.00	L-BR-FA5D	2026-04-06	Bottle	Engine Oil	150.00	Active	\N
334	2	\N	KOBY TIRE BLACK	50.00	S-KO-TIB	2026-04-06	Piece	Tire	80.00	Active	\N
335	1	\N	ADD OIL RACERX 200ML	20.00	L-AD-OR2M	2026-04-06	Bottle	Engine Oil	50.00	Active	\N
336	2	\N	TIRE SEALANT PROTIRE	35.50	S-TI-SEP	2026-04-06	Piece	Tire	100.00	Active	\N
337	4	\N	PULLEY SET JVT MIO/FINO/NOUVO	1508.91	O-PU-SJM	2026-04-06	Piece	Others	1957.00	Active	\N
338	4	\N	PULLEY SET JVT MIOi125/m3	1865.81	O-PU-SJ1M	2026-04-06	Piece	Others	2397.00	Active	\N
339	4	\N	CLUTCH LINING JVT BEAT FI	816.00	O-CL-LJF	2026-04-06	Piece	Others	1005.00	Active	\N
340	4	\N	CLUTCH LINING JVT MIO	820.45	O-CL-LJM	2026-04-06	Piece	Others	1020.00	Active	\N
341	2	\N	FLYBALL JVT PCX 19G	297.28	S-FL-JP1G	2026-04-06	Set	Flyball	550.00	Active	\N
342	4	\N	SLIDER PIECE JVT NMAX/M3/AEROX	79.19	O-SL-PJ3N	2026-04-06	Piece	Others	200.00	Active	\N
343	2	\N	BELT CWORKS 2PH	486.00	S-BE-CW2P	2026-04-06	Piece	Drive Belt	600.00	Active	\N
344	2	\N	BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX	279.00	S-BR-SC3S	2026-04-06	Set	Brake Shoe	350.00	Active	\N
345	2	\N	BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI	225.00	S-BR-SCF	2026-04-06	Set	Brake Shoe	290.00	Active	\N
346	2	\N	BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT	144.00	S-BR-PCF	2026-04-06	Set	Brake Pad	195.00	Active	\N
347	2	\N	BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155	144.00	S-BR-PC3S	2026-04-06	Set	Brake Pad	195.00	Active	\N
324	4	\N	A6300	25.00	O-A6	2026-04-06	Piece	Others	110.00	Active	\N
348	4	\N	CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM	162.00	O-CL-SC8R	2026-04-06	Piece	Others	250.00	Active	\N
349	4	\N	SLIDER PIECE CWORKS CLICK125i/150/V1V2V3	58.50	O-SL-PC1C	2026-04-06	Piece	Others	100.00	Active	\N
350	4	\N	SLIDER PIECE CWORKS BEAT V1V2V3/GY6	58.50	O-SL-PC1V	2026-04-06	Piece	Others	100.00	Active	\N
351	4	\N	SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3	58.50	O-SL-PC1N	2026-04-06	Piece	Others	100.00	Active	\N
352	2	\N	BEARING KOYO 6002	25.00	S-BE-KO6-011	2026-04-06	Piece	Bearing	100.00	Active	\N
353	2	\N	BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100	70.00	S-BA-BO1C	2026-04-06	Piece	Bearing	350.00	Active	\N
354	1	\N	IGNITION COIL LAZX	150.00	L-IG-COL	2026-04-06	Bottle	Engine Oil	300.00	Active	\N
355	2	\N	BEARING KOYO 62/22	85.00	S-BE-KO6-012	2026-04-06	Piece	Bearing	250.00	Active	\N
356	1	\N	IGNITION COIL KHC	150.00	L-IG-COK	2026-04-06	Bottle	Engine Oil	250.00	Active	\N
357	4	\N	BATTERY MOTOLITE MF4LB	700.00	O-BA-MO4M	2026-04-06	Piece	Others	850.00	Active	\N
358	4	\N	BATTERY MOTOLITE CHAMPION MTZ6V	900.00	O-BA-MC6M	2026-04-06	Piece	Others	1000.00	Active	\N
359	1	\N	COOLANT PETRON 500ML	80.00	L-CO-PE5M	2026-04-06	Bottle	Engine Oil	150.00	Active	\N
360	4	\N	TENSIONER YAMAHA	164.00	O-TE-Y	2026-04-06	Piece	Others	300.00	Active	\N
361	4	\N	SPEED CABLE WAVE	60.00	O-SP-CAW	2026-04-06	Piece	Others	150.00	Active	\N
362	2	\N	QUICK TIRE 100/80-14	1115.00	S-QU-TI1	2026-04-06	Piece	Tire	1315.00	Active	\N
363	1	\N	OIL SEAL BACKPLATE M3	92.31	L-OI-SB3M	2026-04-06	Bottle	Engine Oil	120.00	Active	\N
364	4	\N	HONDA BLUE SCT 800ML 285	285.00	O-HO-BS2	2026-04-06	Piece	Others	340.00	Active	\N
365	4	\N	FLASHER RELAY ADJUSTABLE	45.00	O-FL-REA	2026-04-06	Piece	Others	120.00	Active	\N
366	4	\N	FLASHER RELAY DZJ	40.00	O-FL-RED	2026-04-06	Piece	Others	100.00	Active	\N
367	4	\N	NUT STAINLESS 12MM	6.00	O-NU-ST1M-001	2026-04-06	Piece	Others	10.00	Active	\N
368	2	\N	QUICK TIRE 90/90-14	1041.71	S-QU-TI9	2026-04-06	Piece	Tire	1242.00	Active	\N
369	2	\N	BRAKE PAD YAMAKOTO ADV/PCX REAR	30.00	S-BR-PYR-002	2026-04-06	Set	Brake Pad	100.00	Active	\N
370	4	\N	THROTTLE CABLE MAKOTO SNIPER MXI VVA	140.00	O-TH-CMV	2026-04-06	Piece	Others	280.00	Active	\N
371	4	\N	CLUTCH CABLE WOLF 125	70.00	O-CL-CW1	2026-04-06	Piece	Others	15.00	Active	\N
372	4	\N	CHAIN ADJUSTER KHC	40.00	O-CH-ADK	2026-04-06	Piece	Others	80.00	Active	\N
373	4	\N	CARBON CLEANER HONDA	25.00	O-CA-CLH	2026-04-06	Piece	Others	50.00	Active	\N
374	2	\N	BELT NMAX YAMAKOTO	250.00	S-BE-NMY	2026-04-06	Piece	Drive Belt	350.00	Active	\N
375	4	\N	WIRE #18 OLD STOCK	15.00	O-WI-#OS	2026-04-06	Piece	Others	25.00	Active	\N
376	2	\N	AIR FILTER NMAX V2	127.00	S-AI-FN2V	2026-04-06	Piece	Air Filter	250.00	Active	\N
377	4	\N	BOLT AND NUT 10MM	6.00	O-BO-AN1M	2026-04-06	Piece	Others	15.00	Active	\N
378	2	\N	BELT HONDA CLICK 150	354.00	S-BE-HC1	2026-04-06	Piece	Drive Belt	700.00	Active	\N
379	1	\N	PETRON MONOGRADE / SC400 / SCT	188.28	L-PE-M/S	2026-04-06	Bottle	Engine Oil	226.60	Active	\N
380	1	\N	RS8 R9 1L / ARS8 ENGINE OIL	239.10	L-RS-R1O	2026-04-06	Bottle	Engine Oil	312.87	Active	\N
381	1	\N	AJVT / ASUN RACING GEAR OIL	225.89	L-AJ-/AO	2026-04-06	Bottle	Gear Oil	282.58	Active	\N
382	1	\N	BRAKE FLUID SURE / AEROMOTIVE	131.13	L-BR-FSA	2026-04-06	Bottle	Brake Fluid	162.68	Active	\N
383	1	\N	COOLANT THAI / PETRON 500ML	130.18	L-CO-T/5M	2026-04-06	Bottle	Coolant	175.40	Active	\N
385	2	\N	PEANUT BULB ORANGE / WHITE	204.68	S-PE-BOW	2026-04-06	Piece	Light Bulb	277.33	Active	\N
386	2	\N	TAIL / HEAD LIGHT BULB	231.81	S-TA-/HB	2026-04-06	Piece	Light Bulb	281.98	Active	\N
387	2	\N	STARTER / ON-OFF / HORN SW	107.89	S-ST-/OS	2026-04-06	Piece	Switch	132.95	Active	\N
388	2	\N	BRAKE SWITCH L / R	106.75	S-BR-SLR	2026-04-06	Piece	Switch	131.22	Active	\N
389	2	\N	HAZARD / H/L / L/R SWITCH	159.31	S-HA-/HS	2026-04-06	Piece	Switch	218.88	Active	\N
390	2	\N	HORN RELAY (4-PIN / 5-PIN)	71.16	S-HO-R(5P	2026-04-06	Piece	Relay	91.29	Active	\N
391	2	\N	FUSE 10A / 15A / GLASS	238.07	S-FU-1/G	2026-04-06	Piece	Fuse	320.92	Active	\N
392	3	\N	HORN HELLA / BOSCH 190	192.64	A-HO-H/1	2026-04-06	Set/Piece	Horn	269.11	Active	\N
393	2	\N	STARTER RELAY MIO / XR / TMX	303.72	S-ST-RMT	2026-04-06	Piece	Relay	369.27	Active	\N
394	2	\N	REGULATOR RECTIFIER SKYDRIVE	190.71	S-RE-RES	2026-04-06	Piece	Regulator	242.77	Active	\N
395	2	\N	FUSE / FUSE BOX	102.31	S-FU-/FB	2026-04-06	Piece	Fuse	127.15	Active	\N
396	3	\N	HEAD LIGHT LED T19 WHITE	70.58	A-HE-LLW	2026-04-06	Piece	LED Bulb	95.72	Active	\N
397	3	\N	HEAD LIGHT LED MDL KILLER	220.09	A-HE-LLK	2026-04-06	Piece	LED Bulb	270.83	Active	\N
398	3	\N	PARK LIGHT T15 (W/B/Y)	77.03	A-PA-LTW	2026-04-06	Piece	LED Bulb	97.99	Active	\N
399	4	\N	PEANUT BULB T13 (W/O)	55.63	O-PE-BTW-001	2026-04-06	Piece	Bulb	71.56	Active	\N
400	4	\N	AUTO WIRE #18 JAPAN	194.25	O-AU-W#J	2026-04-06	Piece/Pack	Consumables	240.27	Active	\N
401	2	\N	BATTERY MOTOLITE MF4LB / MTZ6V	54.47	S-BA-MM6M	2026-04-06	Piece	Battery	75.58	Active	\N
402	2	\N	IGNITION COIL LAZX / KHC	348.38	S-IG-CLK	2026-04-06	Piece	Ignition	457.36	Active	\N
403	2	\N	REGULATOR BARAKO / LAM9	218.79	S-RE-B/9L	2026-04-06	Piece	Regulator	290.62	Active	\N
404	4	\N	HEADLIGHT LED 200 / T15 BLUE	288.75	O-HE-L2B	2026-04-06	Piece	LED Light	387.66	Active	\N
405	2	\N	FLASHER RELAY ADJ / DZJ	318.50	S-FL-RAD	2026-04-06	Piece	Relay	383.38	Active	\N
406	4	\N	TIRE SEALANT KOBY / KHC	195.66	O-TI-SKK	2026-04-06	Bottle	Tire Sealant	267.53	Active	\N
407	2	\N	CORSA R26 80/80-14 / 90/80	232.24	S-CO-R89	2026-04-06	Piece	Tire	279.72	Active	\N
408	2	\N	FALCON VIPER 6160 90/90-14	349.50	S-FA-V69	2026-04-06	Piece	Tire	475.55	Active	\N
409	2	\N	FALCON VIPER SPEED 90/80	262.02	S-FA-VS9	2026-04-06	Piece	Tire	344.76	Active	\N
410	2	\N	FALCON VIPER EXTREME (VAR)	286.73	S-FA-VEV	2026-04-06	Piece	Tire	381.14	Active	\N
411	2	\N	CORSA 110/130 M5 & R26	269.44	S-CO-1M2R	2026-04-06	Piece	Tire	326.37	Active	\N
412	2	\N	QUICK TIRE 100/80 / 90/90	133.54	S-QU-T19	2026-04-06	Piece	Tire	185.52	Active	\N
413	4	\N	TIRE SEALANT BR / PROTIRE	307.37	O-TI-SBP	2026-04-06	Bottle	Tire Sealant	395.89	Active	\N
414	2	\N	INTERIOR / KRX TUBE	75.73	S-IN-/KT	2026-04-06	Piece	Inner Tube	93.72	Active	\N
415	2	\N	HONDA BELT CLICK 23100-K35	128.31	S-HO-BC2K	2026-04-06	Piece	Drive Belt	168.31	Active	\N
416	2	\N	JVT FLYBALL 15G - PCX/CLICK	97.98	S-JV-F1P-001	2026-04-06	Set	Flyball	122.21	Active	\N
417	2	\N	YAKIMOTO FLYBALL 10G - MIO	96.84	S-YA-F1M	2026-04-06	Set	Flyball	130.48	Active	\N
418	2	\N	BELT YAMAHA 5TL MIO	233.93	S-BE-Y5M	2026-04-06	Piece	Drive Belt	301.49	Active	\N
419	2	\N	BELT HONDA PCX/ADV 160	332.47	S-BE-HP1-001	2026-04-06	Piece	Drive Belt	449.21	Active	\N
420	2	\N	FLYBALL JVT (13G/19G)	191.25	S-FL-JV1G	2026-04-06	Set	Flyball	236.86	Active	\N
421	2	\N	FLYBALL CWORKS (12G/13G)	53.73	S-FL-CW1G	2026-04-06	Set	Flyball	69.22	Active	\N
422	2	\N	SLIDER PIECE HONDA / JVT	288.32	S-SL-PHJ	2026-04-06	Set	Slider Piece	368.94	Active	\N
423	2	\N	CLUTCH SHOE JVT SET	324.99	S-CL-SJS	2026-04-06	Piece/Set	Clutch Shoe	402.50	Active	\N
424	2	\N	AIR FILTER CLICK / AEROX	281.73	S-AI-FCA	2026-04-06	Piece	Air Filter	342.93	Active	\N
425	2	\N	AIR FILTER PCX / KLX / NMAX	166.23	S-AI-FPN	2026-04-06	Piece	Air Filter	218.93	Active	\N
426	2	\N	RACING CARBURETOR KEIHIN	215.51	S-RA-CAK	2026-04-06	Piece	Carburetor	278.40	Active	\N
427	2	\N	FUEL PUMP ASSEMBLY BEAT FI	62.80	S-FU-PAF	2026-04-06	Piece	Fuel Pump	78.35	Active	\N
428	2	\N	BELT CWORKS 2PH / NMAX / CLICK	99.21	S-BE-C2C	2026-04-06	Piece	Drive Belt	119.67	Active	\N
429	2	\N	CLUTCH LINING JVT (VARIOUS)	324.84	S-CL-LJV	2026-04-06	Set	Clutch Lining	407.40	Active	\N
430	2	\N	FLYBALL JVT PCX 19G / MTRT	229.58	S-FL-JPM	2026-04-06	Set	Flyball	305.78	Active	\N
431	2	\N	SLIDER PIECE CWORKS / JVT / SUN	312.03	S-SL-PCS	2026-04-06	Set	Slider Piece	435.87	Active	\N
432	2	\N	CLUTCH SPRING CWORKS / GEN	323.57	S-CL-SCG	2026-04-06	Set	Clutch Spring	399.68	Active	\N
433	2	\N	PULLEY SET JVT (VARIOUS)	63.18	S-PU-SJV	2026-04-06	Set	Pulley Set	81.29	Active	\N
434	2	\N	SPROCKET SET / ENGINE / TMX	134.40	S-SP-S/T	2026-04-06	Set	Sprockets	186.13	Active	\N
435	2	\N	BRAKE PAD YAMAKOTO SHOGUN	51.84	S-BR-PYS	2026-04-06	Set	Brake Pad	71.77	Active	\N
436	2	\N	BRAKE PAD YAMAKOTO CLICK	245.90	S-BR-PYC	2026-04-06	Set	Brake Pad	307.62	Active	\N
437	2	\N	YAMAHA GENUINE PADS 2DP	98.33	S-YA-GP2D	2026-04-06	Set	Brake Pad	121.00	Active	\N
438	2	\N	BRAKE PAD YAMAKOTO (VAR)	239.58	S-BR-PYV	2026-04-06	Set	Brake Pad	311.86	Active	\N
439	2	\N	BRAKE PAD HONDA (B6H/GEN)	212.96	S-BR-PH6B-001	2026-04-06	Set	Brake Pad	268.35	Active	\N
440	2	\N	BRAKE PAD YAMAHA (MIO/AEROX)	234.68	S-BR-PYM	2026-04-06	Set	Brake Pad	323.47	Active	\N
441	2	\N	BRAKE SHOE HONDA CLICK GEN	134.53	S-BR-SHG-001	2026-04-06	Set	Brake Shoe	187.54	Active	\N
442	2	\N	BRAKE MASTER REPAIR KIT	271.43	S-BR-MRK	2026-04-06	Set	Repair Kit	353.33	Active	\N
443	2	\N	BALLRACE / BEARING (VAR)	232.89	S-BA-/BV	2026-04-06	Set	Ballrace	311.92	Active	\N
444	2	\N	OIL SEAL (PULLEY/AXLE)	153.74	S-OI-SEP	2026-04-06	Piece	Oil Seal	214.68	Active	\N
445	2	\N	THROTTLE / CLUTCH / BRAKE CAB	245.32	S-TH-/CC	2026-04-06	Piece	Cable	334.49	Active	\N
446	2	\N	BRAKE PAD CWORKS (VARIOUS)	117.50	S-BR-PCV	2026-04-06	Set	Brake Pad	161.96	Active	\N
447	2	\N	BRAKE PAD YAMAKOTO ADV / PCX	176.05	S-BR-PYP-001	2026-04-06	Set	Brake Pad	215.12	Active	\N
448	2	\N	BRAKE PAD CLICK / ADV / MIO	332.45	S-BR-PCM	2026-04-06	Set	Brake Pad	448.88	Active	\N
449	2	\N	BRAKE SHOE CWORKS / OTAKA	248.57	S-BR-SCO	2026-04-06	Set	Brake Shoe	346.08	Active	\N
450	2	\N	CLUTCH CABLE RAIDER / WOLF	338.45	S-CL-CRW	2026-04-06	Piece	Cable	421.92	Active	\N
451	2	\N	THROTTLE / SPEED / BRAKE CABLE	348.05	S-TH-/SC	2026-04-06	Piece	Cable	417.99	Active	\N
452	2	\N	BALLRACE NMAX / M3 / SUNTAL	176.59	S-BA-N/S	2026-04-06	Set	Ballrace	236.47	Active	\N
453	2	\N	BEARING KOYO 6002 / 62/22 / 6303	282.76	S-BE-K66	2026-04-06	Piece	Bearing	387.95	Active	\N
454	2	\N	FUEL HOSE RED / BLACK (FT)	346.32	S-FU-HRF	2026-04-06	Meter/Piece	Hose	416.79	Active	\N
455	4	\N	WASHER 10 / 12 / 14	219.93	O-WA-1/1	2026-04-06	Piece	Hardware	271.68	Active	\N
456	4	\N	FLARINGS SCREW / PASAK	309.29	O-FL-S/P	2026-04-06	Piece	Hardware	396.61	Active	\N
457	4	\N	STAINLESS SCREW W/ WASHER	193.48	O-ST-SWW-001	2026-04-06	Piece	Hardware	251.12	Active	\N
458	4	\N	BOLT MUSHROOM (S/T/G)	116.50	O-BO-MUS	2026-04-06	Piece	Hardware	160.03	Active	\N
459	4	\N	RUBBER DUMPER WAVE/KHC	307.79	O-RU-DUW	2026-04-06	Piece	Hardware	419.67	Active	\N
460	2	\N	O-RING / FUEL PUMP O-RING	51.97	S-O--/FO	2026-04-06	Piece	O-Ring	69.78	Active	\N
461	4	\N	NUT / BOLT / WASHER STAINLESS	264.20	O-NU-/BS	2026-04-06	Piece	Hardware	331.18	Active	\N
462	4	\N	STEEL BOLT 10MM / 12MM	65.56	O-ST-B11M	2026-04-06	Piece	Hardware	87.62	Active	\N
463	2	\N	O-RING TORQUE DRIVE / CLICK	72.85	S-O--TDC	2026-04-06	Piece	O-Ring	96.72	Active	\N
464	2	\N	OIL SEAL BACKPLATE / PULLEY M3	224.81	S-OI-SB3M	2026-04-06	Piece	Oil Seal	283.13	Active	\N
289	1	\N	ADD OIL PETRON	25.00	L-A-AOP	2026-04-06	Bottle	Engine Oil	50.00	Active	\N
290	4	\N	INTERIOR 2.75	75.00	O-A-IN2	2026-04-06	Piece	Others	150.00	Active	\N
291	4	\N	DIODE	25.00	O-A-D	2026-04-06	Piece	Others	50.00	Active	\N
292	4	\N	ROTOR DISC	125.00	O-A-ROD	2026-04-06	Piece	Others	250.00	Active	\N
384	1	\N	ADD OIL PETRON / RACERX 200M	319.11	L-A-AO2M	2026-04-06	Bottle	Additive	433.34	Active	\N
465	2	4	Yamaha Breakpad Nmax	2000.50	S-YA-BRN	2026-04-08	Piece	Brake Pad	2000.00	Active	\N
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_items (item_id, order_id, product_id, quantity, unit_price) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (order_id, supplier_id, user_id, status, expected_delivery, created_at, received_at, total_items, notes) FROM stdin;
PO-MXBZ23VT	1	\N	Received	2026-04-07	2026-04-04 08:36:36.89	2026-04-04 08:36:57.940004	10	\N
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (report_id, report_type, generated_by, generated_at, payload) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (role_id, role_name, user_id, permissions_text) FROM stdin;
2	Manager	\N	{"Sales": ["View", "Add", "Edit"], "Inventory": ["View", "Add Item", "Edit"], "Products": ["View", "Add Product", "Edit"], "Suppliers": ["View", "Add Supplier", "Edit"], "Reports": ["View", "Generate Report"], "Forecasting": ["View", "Generate Forecast"], "Stock Prediction": ["View", "Run Prediction"], "Purchase Order": ["View", "Create Order", "Edit"], "Product Return": ["View", "Process Return", "Edit"]}
3	Sales Staff	\N	{"Sales": ["View", "Add"], "Inventory": ["View"], "Products": ["View"], "Product Return": ["View", "Process Return"]}
1	Administrator	\N	{"Sales": ["View", "Add", "Edit", "Delete"], "Inventory": ["View", "Add Item", "Edit", "Delete"], "Products": ["View", "Add Product", "Edit", "Delete"], "Suppliers": ["View", "Add Supplier", "Edit", "Delete"], "Reports": ["View", "Generate Report"], "User Management": ["View", "Add User", "Edit User", "Delete User"], "Role Permissions": ["View", "Create", "Edit", "Delete"], "Forecasting": ["View", "Generate Forecast"], "Stock Prediction": ["View", "Run Prediction"], "Audit Log": ["View", "Export"], "Purchase Order": ["View", "Create Order", "Edit", "Delete"], "Product Return": ["View", "Process Return", "Edit"]}
4	Cashier	\N	Point of Sale transactions only
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (invoice_id, pos_terminal_id, user_id, invoice_date, total_amount, tax_amount, customer_info, payment_method, payment_status, service_charge, transaction_timestamp, return_id, cash_received, cash_given, change_amount, contact_number, address, failure_reason, customer_name) FROM stdin;
5822	1	2	2026-04-08	113.30	3.30	Walk-in Customer	Cash	Paid	0.00	2026-04-08 05:30:48.305321	\N	120.00	120.00	6.70	\N	\N	\N	\N
5823	1	2	2026-04-08	294.58	8.58	Walk-in Customer	Cash	Refunded	0.00	2026-04-08 06:36:10.170131	\N	300.00	300.00	5.42	\N	\N	\N	\N
5626	1	5	2026-03-26	296.64	8.64	Walk-in Customer	Cash	Paid	0.00	2026-03-26 11:53:00	\N	296.64	296.64	0.00	\N	\N	\N	\N
5627	1	5	2026-03-26	1173.99	34.19	Walk-in Customer	Cash	Paid	0.00	2026-03-26 11:03:00	\N	1173.99	1173.99	0.00	\N	\N	\N	\N
5628	1	5	2026-03-26	562.01	16.37	Walk-in Customer	Cash	Paid	0.00	2026-03-26 09:20:00	\N	562.01	562.01	0.00	\N	\N	\N	\N
5629	1	5	2026-03-26	3955.71	115.21	Walk-in Customer	Cash	Paid	0.00	2026-03-26 14:00:00	\N	3955.71	3955.71	0.00	\N	\N	\N	\N
5630	1	5	2026-03-26	472.77	13.77	Walk-in Customer	Cash	Paid	0.00	2026-03-26 14:48:00	\N	472.77	472.77	0.00	\N	\N	\N	\N
5631	1	5	2026-03-26	152.65	4.45	Walk-in Customer	Cash	Paid	0.00	2026-03-26 16:33:00	\N	152.65	152.65	0.00	\N	\N	\N	\N
5632	1	5	2026-03-26	3480.10	101.36	Walk-in Customer	Cash	Paid	0.00	2026-03-26 12:49:00	\N	3480.10	3480.10	0.00	\N	\N	\N	\N
5633	1	5	2026-03-26	349.90	10.19	Walk-in Customer	Cash	Paid	0.00	2026-03-26 17:13:00	\N	349.90	349.90	0.00	\N	\N	\N	\N
5634	1	5	2026-03-26	393.05	11.45	Walk-in Customer	Cash	Paid	0.00	2026-03-26 15:39:00	\N	393.05	393.05	0.00	\N	\N	\N	\N
5635	1	5	2026-03-26	58.71	1.71	Walk-in Customer	Cash	Paid	0.00	2026-03-26 11:28:00	\N	58.71	58.71	0.00	\N	\N	\N	\N
5636	1	5	2026-03-26	98.88	2.88	Walk-in Customer	Cash	Paid	0.00	2026-03-26 19:41:00	\N	98.88	98.88	0.00	\N	\N	\N	\N
5637	1	5	2026-03-26	1004.25	29.25	Walk-in Customer	Cash	Paid	0.00	2026-03-26 10:23:00	\N	1004.25	1004.25	0.00	\N	\N	\N	\N
5638	1	5	2026-03-27	579.64	16.88	Walk-in Customer	Cash	Paid	0.00	2026-03-27 15:52:00	\N	579.64	579.64	0.00	\N	\N	\N	\N
5639	1	5	2026-03-27	1333.51	38.84	Walk-in Customer	Cash	Paid	0.00	2026-03-27 16:20:00	\N	1333.51	1333.51	0.00	\N	\N	\N	\N
5640	1	5	2026-03-27	1321.49	38.49	Walk-in Customer	Cash	Paid	0.00	2026-03-27 17:34:00	\N	1321.49	1321.49	0.00	\N	\N	\N	\N
5641	1	5	2026-03-27	26.04	0.76	Walk-in Customer	Cash	Paid	0.00	2026-03-27 10:10:00	\N	26.04	26.04	0.00	\N	\N	\N	\N
5642	1	5	2026-03-27	896.10	26.10	Walk-in Customer	Cash	Paid	0.00	2026-03-27 18:46:00	\N	896.10	896.10	0.00	\N	\N	\N	\N
5643	1	5	2026-03-27	6160.17	179.42	Walk-in Customer	Cash	Paid	0.00	2026-03-27 14:20:00	\N	6160.17	6160.17	0.00	\N	\N	\N	\N
5644	1	5	2026-03-27	450.07	13.11	Walk-in Customer	Cash	Paid	0.00	2026-03-27 11:48:00	\N	450.07	450.07	0.00	\N	\N	\N	\N
5645	1	5	2026-03-27	4404.55	128.29	Walk-in Customer	Cash	Paid	0.00	2026-03-27 15:03:00	\N	4404.55	4404.55	0.00	\N	\N	\N	\N
5646	1	5	2026-03-27	392.43	11.43	Walk-in Customer	Cash	Paid	0.00	2026-03-27 13:26:00	\N	392.43	392.43	0.00	\N	\N	\N	\N
5647	1	5	2026-03-27	4574.44	133.24	Walk-in Customer	Cash	Paid	0.00	2026-03-27 19:12:00	\N	4574.44	4574.44	0.00	\N	\N	\N	\N
5648	1	5	2026-03-27	696.28	20.28	Walk-in Customer	Cash	Paid	0.00	2026-03-27 12:46:00	\N	696.28	696.28	0.00	\N	\N	\N	\N
5649	1	5	2026-03-27	1232.68	35.90	Walk-in Customer	Cash	Paid	0.00	2026-03-27 10:00:00	\N	1232.68	1232.68	0.00	\N	\N	\N	\N
5650	1	5	2026-03-27	26.78	0.78	Walk-in Customer	Cash	Paid	0.00	2026-03-27 15:24:00	\N	26.78	26.78	0.00	\N	\N	\N	\N
5651	1	5	2026-03-28	1004.22	29.25	Walk-in Customer	Cash	Paid	0.00	2026-03-28 15:09:00	\N	1004.22	1004.22	0.00	\N	\N	\N	\N
5652	1	5	2026-03-28	1575.64	45.89	Walk-in Customer	Cash	Paid	0.00	2026-03-28 09:32:00	\N	1575.64	1575.64	0.00	\N	\N	\N	\N
5653	1	5	2026-03-28	515.95	15.03	Walk-in Customer	Cash	Paid	0.00	2026-03-28 16:31:00	\N	515.95	515.95	0.00	\N	\N	\N	\N
5654	1	5	2026-03-28	314.15	9.15	Walk-in Customer	Cash	Paid	0.00	2026-03-28 09:04:00	\N	314.15	314.15	0.00	\N	\N	\N	\N
5655	1	5	2026-03-28	208.38	6.07	Walk-in Customer	Cash	Paid	0.00	2026-03-28 16:33:00	\N	208.38	208.38	0.00	\N	\N	\N	\N
5656	1	5	2026-03-28	345.59	10.07	Walk-in Customer	Cash	Paid	0.00	2026-03-28 17:16:00	\N	345.59	345.59	0.00	\N	\N	\N	\N
5657	1	5	2026-03-28	1149.48	33.48	Walk-in Customer	Cash	Paid	0.00	2026-03-28 13:11:00	\N	1149.48	1149.48	0.00	\N	\N	\N	\N
5658	1	5	2026-03-28	1154.49	33.63	Walk-in Customer	Cash	Paid	0.00	2026-03-28 12:35:00	\N	1154.49	1154.49	0.00	\N	\N	\N	\N
5659	1	5	2026-03-28	425.80	12.40	Walk-in Customer	Cash	Paid	0.00	2026-03-28 15:57:00	\N	425.80	425.80	0.00	\N	\N	\N	\N
5660	1	5	2026-03-28	2811.90	81.90	Walk-in Customer	Cash	Paid	0.00	2026-03-28 17:19:00	\N	2811.90	2811.90	0.00	\N	\N	\N	\N
5661	1	5	2026-03-28	1985.23	57.82	Walk-in Customer	Cash	Paid	0.00	2026-03-28 19:38:00	\N	1985.23	1985.23	0.00	\N	\N	\N	\N
5662	1	5	2026-03-28	633.45	18.45	Walk-in Customer	Cash	Paid	0.00	2026-03-28 16:38:00	\N	633.45	633.45	0.00	\N	\N	\N	\N
5663	1	5	2026-03-28	230.72	6.72	Walk-in Customer	Cash	Paid	0.00	2026-03-28 10:00:00	\N	230.72	230.72	0.00	\N	\N	\N	\N
5664	1	5	2026-03-29	5815.96	169.40	Walk-in Customer	Cash	Paid	0.00	2026-03-29 14:59:00	\N	5815.96	5815.96	0.00	\N	\N	\N	\N
5665	1	5	2026-03-29	221.98	6.47	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:01:00	\N	221.98	221.98	0.00	\N	\N	\N	\N
5666	1	5	2026-03-29	1027.33	29.92	Walk-in Customer	Cash	Paid	0.00	2026-03-29 14:50:00	\N	1027.33	1027.33	0.00	\N	\N	\N	\N
5667	1	5	2026-03-29	618.00	18.00	Walk-in Customer	Cash	Paid	0.00	2026-03-29 14:50:00	\N	618.00	618.00	0.00	\N	\N	\N	\N
5668	1	5	2026-03-29	7240.08	210.88	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:50:00	\N	7240.08	7240.08	0.00	\N	\N	\N	\N
5669	1	5	2026-03-29	193.93	5.65	Walk-in Customer	Cash	Paid	0.00	2026-03-29 10:37:00	\N	193.93	193.93	0.00	\N	\N	\N	\N
5670	1	5	2026-03-29	692.68	20.18	Walk-in Customer	Cash	Paid	0.00	2026-03-29 13:37:00	\N	692.68	692.68	0.00	\N	\N	\N	\N
5671	1	5	2026-03-29	456.05	13.28	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:15:00	\N	456.05	456.05	0.00	\N	\N	\N	\N
5672	1	5	2026-03-29	537.66	15.66	Walk-in Customer	Cash	Paid	0.00	2026-03-29 15:54:00	\N	537.66	537.66	0.00	\N	\N	\N	\N
5673	1	5	2026-03-29	527.36	15.36	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:57:00	\N	527.36	527.36	0.00	\N	\N	\N	\N
5674	1	5	2026-03-29	833.21	24.27	Walk-in Customer	Cash	Paid	0.00	2026-03-29 18:39:00	\N	833.21	833.21	0.00	\N	\N	\N	\N
5675	1	5	2026-03-29	690.10	20.10	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:31:00	\N	690.10	690.10	0.00	\N	\N	\N	\N
5676	1	5	2026-03-29	993.56	28.94	Walk-in Customer	Cash	Paid	0.00	2026-03-29 12:38:00	\N	993.56	993.56	0.00	\N	\N	\N	\N
5677	1	5	2026-03-29	88.20	2.57	Walk-in Customer	Cash	Paid	0.00	2026-03-29 11:52:00	\N	88.20	88.20	0.00	\N	\N	\N	\N
5678	1	5	2026-03-29	1101.91	32.09	Walk-in Customer	Cash	Paid	0.00	2026-03-29 14:14:00	\N	1101.91	1101.91	0.00	\N	\N	\N	\N
5679	1	5	2026-03-29	350.20	10.20	Walk-in Customer	Cash	Paid	0.00	2026-03-29 15:03:00	\N	350.20	350.20	0.00	\N	\N	\N	\N
5680	1	5	2026-03-29	1049.44	30.57	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:03:00	\N	1049.44	1049.44	0.00	\N	\N	\N	\N
5681	1	5	2026-03-29	249.26	7.26	Walk-in Customer	Cash	Paid	0.00	2026-03-29 19:07:00	\N	249.26	249.26	0.00	\N	\N	\N	\N
5682	1	5	2026-03-29	2.06	0.06	Walk-in Customer	Cash	Paid	0.00	2026-03-29 13:51:00	\N	2.06	2.06	0.00	\N	\N	\N	\N
5683	1	5	2026-03-29	3800.29	110.69	Walk-in Customer	Cash	Paid	0.00	2026-03-29 15:26:00	\N	3800.29	3800.29	0.00	\N	\N	\N	\N
5684	1	5	2026-03-29	368.49	10.73	Walk-in Customer	Cash	Paid	0.00	2026-03-29 11:13:00	\N	368.49	368.49	0.00	\N	\N	\N	\N
5685	1	5	2026-03-29	563.90	16.42	Walk-in Customer	Cash	Paid	0.00	2026-03-29 17:29:00	\N	563.90	563.90	0.00	\N	\N	\N	\N
5686	1	5	2026-03-29	570.08	16.60	Walk-in Customer	Cash	Paid	0.00	2026-03-29 09:20:00	\N	570.08	570.08	0.00	\N	\N	\N	\N
5687	1	5	2026-03-29	473.80	13.80	Walk-in Customer	Cash	Paid	0.00	2026-03-29 10:21:00	\N	473.80	473.80	0.00	\N	\N	\N	\N
5688	1	5	2026-03-29	4.64	0.14	Walk-in Customer	Cash	Paid	0.00	2026-03-29 10:01:00	\N	4.64	4.64	0.00	\N	\N	\N	\N
5689	1	5	2026-03-29	350.71	10.21	Walk-in Customer	Cash	Paid	0.00	2026-03-29 16:05:00	\N	350.71	350.71	0.00	\N	\N	\N	\N
5690	1	5	2026-03-30	606.62	17.67	Walk-in Customer	Cash	Paid	0.00	2026-03-30 19:10:00	\N	606.62	606.62	0.00	\N	\N	\N	\N
5691	1	5	2026-03-30	391.40	11.40	Walk-in Customer	Cash	Paid	0.00	2026-03-30 12:55:00	\N	391.40	391.40	0.00	\N	\N	\N	\N
5692	1	5	2026-03-30	652.08	18.99	Walk-in Customer	Cash	Paid	0.00	2026-03-30 13:20:00	\N	652.08	652.08	0.00	\N	\N	\N	\N
5693	1	5	2026-03-30	1077.38	31.38	Walk-in Customer	Cash	Paid	0.00	2026-03-30 14:34:00	\N	1077.38	1077.38	0.00	\N	\N	\N	\N
5694	1	5	2026-03-30	30.90	0.90	Walk-in Customer	Cash	Paid	0.00	2026-03-30 09:06:00	\N	30.90	30.90	0.00	\N	\N	\N	\N
5695	1	5	2026-03-30	851.86	24.81	Walk-in Customer	Cash	Paid	0.00	2026-03-30 14:11:00	\N	851.86	851.86	0.00	\N	\N	\N	\N
5696	1	5	2026-03-30	1402.98	40.86	Walk-in Customer	Cash	Paid	0.00	2026-03-30 15:43:00	\N	1402.98	1402.98	0.00	\N	\N	\N	\N
5697	1	5	2026-03-30	30.90	0.90	Walk-in Customer	Cash	Paid	0.00	2026-03-30 18:47:00	\N	30.90	30.90	0.00	\N	\N	\N	\N
5698	1	5	2026-03-30	363.78	10.60	Walk-in Customer	Cash	Paid	0.00	2026-03-30 17:47:00	\N	363.78	363.78	0.00	\N	\N	\N	\N
5699	1	5	2026-03-30	440.84	12.84	Walk-in Customer	Cash	Paid	0.00	2026-03-30 16:02:00	\N	440.84	440.84	0.00	\N	\N	\N	\N
5700	1	5	2026-03-30	597.40	17.40	Walk-in Customer	Cash	Paid	0.00	2026-03-30 17:25:00	\N	597.40	597.40	0.00	\N	\N	\N	\N
5701	1	5	2026-03-30	25.75	0.75	Walk-in Customer	Cash	Paid	0.00	2026-03-30 12:57:00	\N	25.75	25.75	0.00	\N	\N	\N	\N
5702	1	5	2026-03-31	1598.43	46.56	Walk-in Customer	Cash	Paid	0.00	2026-03-31 15:48:00	\N	1598.43	1598.43	0.00	\N	\N	\N	\N
5703	1	5	2026-03-31	1171.01	34.11	Walk-in Customer	Cash	Paid	0.00	2026-03-31 15:41:00	\N	1171.01	1171.01	0.00	\N	\N	\N	\N
5704	1	5	2026-03-31	291.24	8.48	Walk-in Customer	Cash	Paid	0.00	2026-03-31 14:19:00	\N	291.24	291.24	0.00	\N	\N	\N	\N
5705	1	5	2026-03-31	978.42	28.50	Walk-in Customer	Cash	Paid	0.00	2026-03-31 16:13:00	\N	978.42	978.42	0.00	\N	\N	\N	\N
5706	1	5	2026-03-31	464.77	13.54	Walk-in Customer	Cash	Paid	0.00	2026-03-31 12:53:00	\N	464.77	464.77	0.00	\N	\N	\N	\N
5707	1	5	2026-03-31	30.90	0.90	Walk-in Customer	Cash	Paid	0.00	2026-03-31 11:47:00	\N	30.90	30.90	0.00	\N	\N	\N	\N
5708	1	5	2026-03-31	652.63	19.01	Walk-in Customer	Cash	Paid	0.00	2026-03-31 10:47:00	\N	652.63	652.63	0.00	\N	\N	\N	\N
5709	1	5	2026-03-31	471.74	13.74	Walk-in Customer	Cash	Paid	0.00	2026-03-31 14:32:00	\N	471.74	471.74	0.00	\N	\N	\N	\N
5710	1	5	2026-03-31	3473.77	101.18	Walk-in Customer	Cash	Paid	0.00	2026-03-31 10:20:00	\N	3473.77	3473.77	0.00	\N	\N	\N	\N
5711	1	5	2026-03-31	1301.10	37.90	Walk-in Customer	Cash	Paid	0.00	2026-03-31 10:39:00	\N	1301.10	1301.10	0.00	\N	\N	\N	\N
5712	1	5	2026-03-31	1128.88	32.88	Walk-in Customer	Cash	Paid	0.00	2026-03-31 12:16:00	\N	1128.88	1128.88	0.00	\N	\N	\N	\N
5713	1	5	2026-03-31	113.30	3.30	Walk-in Customer	Cash	Paid	0.00	2026-03-31 16:43:00	\N	113.30	113.30	0.00	\N	\N	\N	\N
5714	1	5	2026-03-31	1394.62	40.62	Walk-in Customer	Cash	Paid	0.00	2026-03-31 18:03:00	\N	1394.62	1394.62	0.00	\N	\N	\N	\N
5715	1	5	2026-04-01	8656.87	252.14	Walk-in Customer	Cash	Paid	0.00	2026-04-01 15:26:00	\N	8656.87	8656.87	0.00	\N	\N	\N	\N
5716	1	5	2026-04-01	986.93	28.75	Walk-in Customer	Cash	Paid	0.00	2026-04-01 15:36:00	\N	986.93	986.93	0.00	\N	\N	\N	\N
5717	1	5	2026-04-01	4230.30	123.21	Walk-in Customer	Cash	Paid	0.00	2026-04-01 11:46:00	\N	4230.30	4230.30	0.00	\N	\N	\N	\N
5718	1	5	2026-04-01	2193.90	63.90	Walk-in Customer	Cash	Paid	0.00	2026-04-01 14:30:00	\N	2193.90	2193.90	0.00	\N	\N	\N	\N
5719	1	5	2026-04-01	421.27	12.27	Walk-in Customer	Cash	Paid	0.00	2026-04-01 14:02:00	\N	421.27	421.27	0.00	\N	\N	\N	\N
5720	1	5	2026-04-01	1021.69	29.76	Walk-in Customer	Cash	Paid	0.00	2026-04-01 19:26:00	\N	1021.69	1021.69	0.00	\N	\N	\N	\N
5721	1	5	2026-04-01	12.36	0.36	Walk-in Customer	Cash	Paid	0.00	2026-04-01 16:19:00	\N	12.36	12.36	0.00	\N	\N	\N	\N
5722	1	5	2026-04-01	272.13	7.93	Walk-in Customer	Cash	Paid	0.00	2026-04-01 19:33:00	\N	272.13	272.13	0.00	\N	\N	\N	\N
5723	1	5	2026-04-01	417.15	12.15	Walk-in Customer	Cash	Paid	0.00	2026-04-01 19:53:00	\N	417.15	417.15	0.00	\N	\N	\N	\N
5724	1	5	2026-04-01	3075.58	89.58	Walk-in Customer	Cash	Paid	0.00	2026-04-01 11:05:00	\N	3075.58	3075.58	0.00	\N	\N	\N	\N
5725	1	5	2026-04-01	829.15	24.15	Walk-in Customer	Cash	Paid	0.00	2026-04-01 16:14:00	\N	829.15	829.15	0.00	\N	\N	\N	\N
5726	1	5	2026-04-01	61.80	1.80	Walk-in Customer	Cash	Paid	0.00	2026-04-01 18:30:00	\N	61.80	61.80	0.00	\N	\N	\N	\N
5727	1	5	2026-04-01	492.34	14.34	Walk-in Customer	Cash	Paid	0.00	2026-04-01 16:21:00	\N	492.34	492.34	0.00	\N	\N	\N	\N
5728	1	5	2026-04-01	285.90	8.33	Walk-in Customer	Cash	Paid	0.00	2026-04-01 10:55:00	\N	285.90	285.90	0.00	\N	\N	\N	\N
5729	1	5	2026-04-01	908.70	26.47	Walk-in Customer	Cash	Paid	0.00	2026-04-01 15:27:00	\N	908.70	908.70	0.00	\N	\N	\N	\N
5730	1	5	2026-04-01	771.26	22.46	Walk-in Customer	Cash	Paid	0.00	2026-04-01 12:48:00	\N	771.26	771.26	0.00	\N	\N	\N	\N
5731	1	5	2026-04-01	1712.33	49.87	Walk-in Customer	Cash	Paid	0.00	2026-04-01 14:49:00	\N	1712.33	1712.33	0.00	\N	\N	\N	\N
5732	1	5	2026-04-01	377.80	11.00	Walk-in Customer	Cash	Paid	0.00	2026-04-01 09:25:00	\N	377.80	377.80	0.00	\N	\N	\N	\N
5733	1	5	2026-04-01	700.40	20.40	Walk-in Customer	Cash	Paid	0.00	2026-04-01 12:25:00	\N	700.40	700.40	0.00	\N	\N	\N	\N
5734	1	5	2026-04-02	225.11	6.56	Walk-in Customer	Cash	Paid	0.00	2026-04-02 12:46:00	\N	225.11	225.11	0.00	\N	\N	\N	\N
5735	1	5	2026-04-02	1474.45	42.95	Walk-in Customer	Cash	Paid	0.00	2026-04-02 11:45:00	\N	1474.45	1474.45	0.00	\N	\N	\N	\N
5736	1	5	2026-04-02	1249.23	36.39	Walk-in Customer	Cash	Paid	0.00	2026-04-02 13:42:00	\N	1249.23	1249.23	0.00	\N	\N	\N	\N
5737	1	5	2026-04-02	77.25	2.25	Walk-in Customer	Cash	Paid	0.00	2026-04-02 13:43:00	\N	77.25	77.25	0.00	\N	\N	\N	\N
5738	1	5	2026-04-02	831.96	24.23	Walk-in Customer	Cash	Paid	0.00	2026-04-02 11:28:00	\N	831.96	831.96	0.00	\N	\N	\N	\N
5739	1	5	2026-04-02	808.94	23.56	Walk-in Customer	Cash	Paid	0.00	2026-04-02 13:53:00	\N	808.94	808.94	0.00	\N	\N	\N	\N
5740	1	5	2026-04-02	662.86	19.31	Walk-in Customer	Cash	Paid	0.00	2026-04-02 12:13:00	\N	662.86	662.86	0.00	\N	\N	\N	\N
5741	1	5	2026-04-03	143.17	4.17	Walk-in Customer	Cash	Paid	0.00	2026-04-03 13:56:00	\N	143.17	143.17	0.00	\N	\N	\N	\N
5742	1	5	2026-04-04	1257.51	36.63	Walk-in Customer	Cash	Paid	0.00	2026-04-04 13:46:00	\N	1257.51	1257.51	0.00	\N	\N	\N	\N
5743	1	5	2026-04-04	1664.25	48.47	Walk-in Customer	Cash	Paid	0.00	2026-04-04 10:26:00	\N	1664.25	1664.25	0.00	\N	\N	\N	\N
5744	1	5	2026-04-04	606.15	17.65	Walk-in Customer	Cash	Paid	0.00	2026-04-04 09:06:00	\N	606.15	606.15	0.00	\N	\N	\N	\N
5745	1	5	2026-04-04	185.40	5.40	Walk-in Customer	Cash	Paid	0.00	2026-04-04 14:09:00	\N	185.40	185.40	0.00	\N	\N	\N	\N
5746	1	5	2026-04-04	760.14	22.14	Walk-in Customer	Cash	Paid	0.00	2026-04-04 09:49:00	\N	760.14	760.14	0.00	\N	\N	\N	\N
5747	1	5	2026-04-04	1225.99	35.71	Walk-in Customer	Cash	Paid	0.00	2026-04-04 17:24:00	\N	1225.99	1225.99	0.00	\N	\N	\N	\N
5748	1	5	2026-04-04	1532.38	44.63	Walk-in Customer	Cash	Paid	0.00	2026-04-04 10:42:00	\N	1532.38	1532.38	0.00	\N	\N	\N	\N
5749	1	5	2026-04-05	7003.18	203.98	Walk-in Customer	Cash	Paid	0.00	2026-04-05 12:02:00	\N	7003.18	7003.18	0.00	\N	\N	\N	\N
5750	1	5	2026-04-05	2462.73	71.73	Walk-in Customer	Cash	Paid	0.00	2026-04-05 16:41:00	\N	2462.73	2462.73	0.00	\N	\N	\N	\N
5751	1	5	2026-04-05	381.10	11.10	Walk-in Customer	Cash	Paid	0.00	2026-04-05 12:58:00	\N	381.10	381.10	0.00	\N	\N	\N	\N
5752	1	5	2026-04-05	201.88	5.88	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:44:00	\N	201.88	201.88	0.00	\N	\N	\N	\N
5753	1	5	2026-04-05	297.67	8.67	Walk-in Customer	Cash	Paid	0.00	2026-04-05 18:48:00	\N	297.67	297.67	0.00	\N	\N	\N	\N
5754	1	5	2026-04-05	1190.04	34.66	Walk-in Customer	Cash	Paid	0.00	2026-04-05 17:59:00	\N	1190.04	1190.04	0.00	\N	\N	\N	\N
5755	1	5	2026-04-05	199.28	5.80	Walk-in Customer	Cash	Paid	0.00	2026-04-05 10:54:00	\N	199.28	199.28	0.00	\N	\N	\N	\N
5756	1	5	2026-04-05	162.22	4.72	Walk-in Customer	Cash	Paid	0.00	2026-04-05 09:48:00	\N	162.22	162.22	0.00	\N	\N	\N	\N
5757	1	5	2026-04-05	25.75	0.75	Walk-in Customer	Cash	Paid	0.00	2026-04-05 15:40:00	\N	25.75	25.75	0.00	\N	\N	\N	\N
5758	1	5	2026-04-05	10.30	0.30	Walk-in Customer	Cash	Paid	0.00	2026-04-05 11:19:00	\N	10.30	10.30	0.00	\N	\N	\N	\N
5759	1	5	2026-04-05	1143.27	33.30	Walk-in Customer	Cash	Paid	0.00	2026-04-05 17:34:00	\N	1143.27	1143.27	0.00	\N	\N	\N	\N
5760	1	5	2026-04-05	114.33	3.33	Walk-in Customer	Cash	Paid	0.00	2026-04-05 17:30:00	\N	114.33	114.33	0.00	\N	\N	\N	\N
5761	1	5	2026-04-05	164.09	4.78	Walk-in Customer	Cash	Paid	0.00	2026-04-05 10:14:00	\N	164.09	164.09	0.00	\N	\N	\N	\N
5762	1	5	2026-04-05	1488.26	43.35	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:48:00	\N	1488.26	1488.26	0.00	\N	\N	\N	\N
5763	1	5	2026-04-05	780.01	22.72	Walk-in Customer	Cash	Paid	0.00	2026-04-05 10:20:00	\N	780.01	780.01	0.00	\N	\N	\N	\N
5764	1	5	2026-04-05	269.88	7.86	Walk-in Customer	Cash	Paid	0.00	2026-04-05 19:14:00	\N	269.88	269.88	0.00	\N	\N	\N	\N
5765	1	5	2026-04-05	820.85	23.91	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:10:00	\N	820.85	820.85	0.00	\N	\N	\N	\N
5766	1	5	2026-04-05	226.38	6.59	Walk-in Customer	Cash	Paid	0.00	2026-04-05 17:03:00	\N	226.38	226.38	0.00	\N	\N	\N	\N
5767	1	5	2026-04-05	4988.71	145.30	Walk-in Customer	Cash	Paid	0.00	2026-04-05 16:15:00	\N	4988.71	4988.71	0.00	\N	\N	\N	\N
5768	1	5	2026-04-05	1646.85	47.97	Walk-in Customer	Cash	Paid	0.00	2026-04-05 10:35:00	\N	1646.85	1646.85	0.00	\N	\N	\N	\N
5769	1	5	2026-04-05	1293.76	37.68	Walk-in Customer	Cash	Paid	0.00	2026-04-05 14:21:00	\N	1293.76	1293.76	0.00	\N	\N	\N	\N
5770	1	5	2026-04-05	290.18	8.45	Walk-in Customer	Cash	Paid	0.00	2026-04-05 09:15:00	\N	290.18	290.18	0.00	\N	\N	\N	\N
5771	1	5	2026-04-05	637.70	18.57	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:13:00	\N	637.70	637.70	0.00	\N	\N	\N	\N
5772	1	5	2026-04-05	550.30	16.03	Walk-in Customer	Cash	Paid	0.00	2026-04-05 14:26:00	\N	550.30	550.30	0.00	\N	\N	\N	\N
5773	1	5	2026-04-05	911.67	26.55	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:57:00	\N	911.67	911.67	0.00	\N	\N	\N	\N
5774	1	5	2026-04-05	247.20	7.20	Walk-in Customer	Cash	Paid	0.00	2026-04-05 09:28:00	\N	247.20	247.20	0.00	\N	\N	\N	\N
5775	1	5	2026-04-05	4084.57	118.97	Walk-in Customer	Cash	Paid	0.00	2026-04-05 09:15:00	\N	4084.57	4084.57	0.00	\N	\N	\N	\N
5776	1	5	2026-04-05	41.41	1.21	Walk-in Customer	Cash	Paid	0.00	2026-04-05 19:35:00	\N	41.41	41.41	0.00	\N	\N	\N	\N
5777	1	5	2026-04-05	214.24	6.24	Walk-in Customer	Cash	Paid	0.00	2026-04-05 18:34:00	\N	214.24	214.24	0.00	\N	\N	\N	\N
5778	1	5	2026-04-05	2067.64	60.22	Walk-in Customer	Cash	Paid	0.00	2026-04-05 09:50:00	\N	2067.64	2067.64	0.00	\N	\N	\N	\N
5779	1	5	2026-04-05	144.20	4.20	Walk-in Customer	Cash	Paid	0.00	2026-04-05 13:42:00	\N	144.20	144.20	0.00	\N	\N	\N	\N
5780	1	5	2026-04-05	789.49	22.99	Walk-in Customer	Cash	Paid	0.00	2026-04-05 16:08:00	\N	789.49	789.49	0.00	\N	\N	\N	\N
5781	1	5	2026-04-05	4430.19	129.03	Walk-in Customer	Cash	Paid	0.00	2026-04-05 12:40:00	\N	4430.19	4430.19	0.00	\N	\N	\N	\N
5782	1	5	2026-04-05	1374.69	40.04	Walk-in Customer	Cash	Paid	0.00	2026-04-05 12:44:00	\N	1374.69	1374.69	0.00	\N	\N	\N	\N
5783	1	5	2026-04-05	460.41	13.41	Walk-in Customer	Cash	Paid	0.00	2026-04-05 14:01:00	\N	460.41	460.41	0.00	\N	\N	\N	\N
5784	1	5	2026-04-06	191.58	5.58	Walk-in Customer	Cash	Paid	0.00	2026-04-06 19:34:00	\N	191.58	191.58	0.00	\N	\N	\N	\N
5785	1	5	2026-04-06	1040.92	30.32	Walk-in Customer	Cash	Paid	0.00	2026-04-06 15:46:00	\N	1040.92	1040.92	0.00	\N	\N	\N	\N
5786	1	5	2026-04-06	164.09	4.78	Walk-in Customer	Cash	Paid	0.00	2026-04-06 19:02:00	\N	164.09	164.09	0.00	\N	\N	\N	\N
5787	1	5	2026-04-06	1395.65	40.65	Walk-in Customer	Cash	Paid	0.00	2026-04-06 11:25:00	\N	1395.65	1395.65	0.00	\N	\N	\N	\N
5788	1	5	2026-04-06	349.17	10.17	Walk-in Customer	Cash	Paid	0.00	2026-04-06 17:58:00	\N	349.17	349.17	0.00	\N	\N	\N	\N
5789	1	5	2026-04-06	123.60	3.60	Walk-in Customer	Cash	Paid	0.00	2026-04-06 11:26:00	\N	123.60	123.60	0.00	\N	\N	\N	\N
5790	1	5	2026-04-06	346.08	10.08	Walk-in Customer	Cash	Paid	0.00	2026-04-06 19:48:00	\N	346.08	346.08	0.00	\N	\N	\N	\N
5791	1	5	2026-04-06	3.09	0.09	Walk-in Customer	Cash	Paid	0.00	2026-04-06 13:05:00	\N	3.09	3.09	0.00	\N	\N	\N	\N
5792	1	5	2026-04-06	265.74	7.74	Walk-in Customer	Cash	Paid	0.00	2026-04-06 17:43:00	\N	265.74	265.74	0.00	\N	\N	\N	\N
5793	1	5	2026-04-06	973.22	28.35	Walk-in Customer	Cash	Paid	0.00	2026-04-06 18:46:00	\N	973.22	973.22	0.00	\N	\N	\N	\N
5794	1	5	2026-04-06	390.48	11.37	Walk-in Customer	Cash	Paid	0.00	2026-04-06 10:37:00	\N	390.48	390.48	0.00	\N	\N	\N	\N
5795	1	5	2026-04-06	850.67	24.78	Walk-in Customer	Cash	Paid	0.00	2026-04-06 15:02:00	\N	850.67	850.67	0.00	\N	\N	\N	\N
5796	1	5	2026-04-07	723.06	21.06	Walk-in Customer	Cash	Paid	0.00	2026-04-07 19:05:00	\N	723.06	723.06	0.00	\N	\N	\N	\N
5797	1	5	2026-04-07	2459.64	71.64	Walk-in Customer	Cash	Paid	0.00	2026-04-07 11:01:00	\N	2459.64	2459.64	0.00	\N	\N	\N	\N
5798	1	5	2026-04-07	510.96	14.88	Walk-in Customer	Cash	Paid	0.00	2026-04-07 10:00:00	\N	510.96	510.96	0.00	\N	\N	\N	\N
5799	1	5	2026-04-07	82.40	2.40	Walk-in Customer	Cash	Paid	0.00	2026-04-07 13:32:00	\N	82.40	82.40	0.00	\N	\N	\N	\N
5800	1	5	2026-04-07	795.48	23.17	Walk-in Customer	Cash	Paid	0.00	2026-04-07 15:41:00	\N	795.48	795.48	0.00	\N	\N	\N	\N
5801	1	5	2026-04-07	1050.69	30.60	Walk-in Customer	Cash	Paid	0.00	2026-04-07 17:15:00	\N	1050.69	1050.69	0.00	\N	\N	\N	\N
5802	1	5	2026-04-07	1552.92	45.23	Walk-in Customer	Cash	Paid	0.00	2026-04-07 10:41:00	\N	1552.92	1552.92	0.00	\N	\N	\N	\N
5803	1	5	2026-04-07	20.60	0.60	Walk-in Customer	Cash	Paid	0.00	2026-04-07 14:55:00	\N	20.60	20.60	0.00	\N	\N	\N	\N
5804	1	5	2026-04-07	4270.56	124.39	Walk-in Customer	Cash	Paid	0.00	2026-04-07 14:59:00	\N	4270.56	4270.56	0.00	\N	\N	\N	\N
5805	1	5	2026-04-07	41.20	1.20	Walk-in Customer	Cash	Paid	0.00	2026-04-07 19:41:00	\N	41.20	41.20	0.00	\N	\N	\N	\N
5806	1	5	2026-04-07	2712.71	79.01	Walk-in Customer	Cash	Paid	0.00	2026-04-07 16:48:00	\N	2712.71	2712.71	0.00	\N	\N	\N	\N
5807	1	5	2026-04-07	1690.13	49.23	Walk-in Customer	Cash	Paid	0.00	2026-04-07 11:31:00	\N	1690.13	1690.13	0.00	\N	\N	\N	\N
5808	1	5	2026-04-07	244.11	7.11	Walk-in Customer	Cash	Paid	0.00	2026-04-07 15:13:00	\N	244.11	244.11	0.00	\N	\N	\N	\N
5809	1	5	2026-04-08	1191.44	34.70	Walk-in Customer	Cash	Paid	0.00	2026-04-08 10:24:00	\N	1191.44	1191.44	0.00	\N	\N	\N	\N
5810	1	5	2026-04-08	887.65	25.85	Walk-in Customer	Cash	Paid	0.00	2026-04-08 15:52:00	\N	887.65	887.65	0.00	\N	\N	\N	\N
5811	1	5	2026-04-08	1106.22	32.22	Walk-in Customer	Cash	Paid	0.00	2026-04-08 16:56:00	\N	1106.22	1106.22	0.00	\N	\N	\N	\N
5812	1	5	2026-04-08	1388.31	40.44	Walk-in Customer	Cash	Paid	0.00	2026-04-08 10:37:00	\N	1388.31	1388.31	0.00	\N	\N	\N	\N
5813	1	5	2026-04-08	1561.90	45.49	Walk-in Customer	Cash	Paid	0.00	2026-04-08 13:29:00	\N	1561.90	1561.90	0.00	\N	\N	\N	\N
5814	1	5	2026-04-08	594.82	17.32	Walk-in Customer	Cash	Paid	0.00	2026-04-08 17:25:00	\N	594.82	594.82	0.00	\N	\N	\N	\N
5815	1	5	2026-04-08	1336.69	38.93	Walk-in Customer	Cash	Paid	0.00	2026-04-08 09:53:00	\N	1336.69	1336.69	0.00	\N	\N	\N	\N
5816	1	5	2026-04-08	624.18	18.18	Walk-in Customer	Cash	Paid	0.00	2026-04-08 09:44:00	\N	624.18	624.18	0.00	\N	\N	\N	\N
5817	1	5	2026-04-08	872.17	25.40	Walk-in Customer	Cash	Paid	0.00	2026-04-08 11:35:00	\N	872.17	872.17	0.00	\N	\N	\N	\N
5818	1	5	2026-04-08	12.36	0.36	Walk-in Customer	Cash	Paid	0.00	2026-04-08 10:09:00	\N	12.36	12.36	0.00	\N	\N	\N	\N
5819	1	5	2026-04-08	5156.93	150.20	Walk-in Customer	Cash	Paid	0.00	2026-04-08 14:15:00	\N	5156.93	5156.93	0.00	\N	\N	\N	\N
5820	1	5	2026-04-08	1509.83	43.98	Walk-in Customer	Cash	Refunded	0.00	2026-04-08 13:34:00	\N	1509.83	1509.83	0.00	\N	\N	\N	\N
5821	1	5	2026-04-08	792.87	23.09	Walk-in Customer	Cash	Refunded	0.00	2026-04-08 19:39:00	\N	792.87	792.87	0.00	\N	\N	\N	\N
\.


--
-- Data for Name: sold_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sold_items (sold_item_id, invoice_id, product_id, return_id, quantity, unit_price, subtotal, total_amount) FROM stdin;
1406401	5822	324	\N	1	110.00	110.00	110.00
1406402	5823	227	\N	1	286.00	286.00	286.00
1405912	5626	121	\N	2	5.00	10.00	10.00
1405913	5626	59	\N	2	30.00	60.00	60.00
1405914	5626	123	\N	1	8.00	8.00	8.00
1405915	5626	8	\N	3	70.00	210.00	210.00
1405916	5627	393	\N	3	303.72	911.16	911.16
1405917	5627	21	\N	1	30.00	30.00	30.00
1405918	5627	392	\N	1	192.64	192.64	192.64
1405919	5627	178	\N	3	2.00	6.00	6.00
1405920	5628	132	\N	3	6.15	18.45	18.45
1405921	5628	414	\N	3	75.73	227.19	227.19
1405922	5628	231	\N	2	150.00	300.00	300.00
1405923	5629	243	\N	2	934.80	1869.60	1869.60
1405924	5629	340	\N	2	820.45	1640.90	1640.90
1405925	5629	269	\N	3	100.00	300.00	300.00
1405926	5629	79	\N	1	30.00	30.00	30.00
1405927	5630	152	\N	1	79.00	79.00	79.00
1405928	5630	210	\N	2	100.00	200.00	200.00
1405929	5630	201	\N	3	60.00	180.00	180.00
1405930	5631	164	\N	3	49.40	148.20	148.20
1405931	5632	240	\N	2	256.50	513.00	513.00
1405932	5632	433	\N	3	63.18	189.54	189.54
1405933	5632	246	\N	3	885.40	2656.20	2656.20
1405934	5632	167	\N	1	20.00	20.00	20.00
1405935	5633	141	\N	1	38.00	38.00	38.00
1405936	5633	386	\N	1	231.81	231.81	231.81
1405937	5633	67	\N	1	69.90	69.90	69.90
1405938	5634	241	\N	1	234.00	234.00	234.00
1405939	5634	68	\N	2	73.80	147.60	147.60
1405940	5635	187	\N	2	3.00	6.00	6.00
1405941	5635	120	\N	1	51.00	51.00	51.00
1405942	5636	97	\N	2	33.00	66.00	66.00
1405943	5636	205	\N	1	30.00	30.00	30.00
1405944	5637	6	\N	3	325.00	975.00	975.00
1405945	5638	195	\N	2	118.00	236.00	236.00
1405946	5638	180	\N	1	1.76	1.76	1.76
1405947	5638	29	\N	1	325.00	325.00	325.00
1405948	5639	95	\N	2	60.00	120.00	120.00
1405949	5639	381	\N	3	225.89	677.67	677.67
1405950	5639	176	\N	3	99.00	297.00	297.00
1405951	5639	322	\N	2	100.00	200.00	200.00
1405952	5640	354	\N	2	150.00	300.00	300.00
1405953	5640	268	\N	3	250.00	750.00	750.00
1405954	5640	458	\N	2	116.50	233.00	233.00
1405955	5641	262	\N	2	10.00	20.00	20.00
1405956	5641	180	\N	3	1.76	5.28	5.28
1405957	5642	375	\N	2	15.00	30.00	30.00
1405958	5642	356	\N	3	150.00	450.00	450.00
1405959	5642	135	\N	3	26.00	78.00	78.00
1405960	5642	216	\N	3	104.00	312.00	312.00
1405961	5643	195	\N	1	118.00	118.00	118.00
1405962	5643	110	\N	2	2196.40	4392.80	4392.80
1405963	5643	235	\N	3	297.77	893.31	893.31
1405964	5643	422	\N	2	288.32	576.64	576.64
1405965	5644	457	\N	2	193.48	386.96	386.96
1405966	5644	289	\N	2	25.00	50.00	50.00
1405967	5645	256	\N	3	300.00	900.00	900.00
1405968	5645	113	\N	2	1333.80	2667.60	2667.60
1405969	5645	409	\N	2	262.02	524.04	524.04
1405970	5645	255	\N	3	61.54	184.62	184.62
1405971	5646	376	\N	3	127.00	381.00	381.00
1405972	5647	225	\N	2	40.00	80.00	80.00
1405973	5647	250	\N	2	2173.60	4347.20	4347.20
1405974	5647	85	\N	2	7.00	14.00	14.00
1405975	5648	92	\N	2	338.00	676.00	676.00
1405976	5649	33	\N	1	261.00	261.00	261.00
1405977	5649	443	\N	2	232.89	465.78	465.78
1405978	5649	2	\N	2	234.00	468.00	468.00
1405979	5649	103	\N	1	2.00	2.00	2.00
1405980	5650	135	\N	1	26.00	26.00	26.00
1405981	5651	423	\N	3	324.99	974.97	974.97
1405982	5652	386	\N	3	231.81	695.43	695.43
1405983	5652	239	\N	2	247.50	495.00	495.00
1405984	5652	445	\N	1	245.32	245.32	245.32
1405985	5652	215	\N	1	94.00	94.00	94.00
1405986	5653	439	\N	2	212.96	425.92	425.92
1405987	5653	54	\N	1	75.00	75.00	75.00
1405988	5654	225	\N	2	40.00	80.00	80.00
1405989	5654	259	\N	3	75.00	225.00	225.00
1405990	5655	395	\N	1	102.31	102.31	102.31
1405991	5655	285	\N	1	100.00	100.00	100.00
1405992	5656	179	\N	3	60.00	180.00	180.00
1405993	5656	435	\N	3	51.84	155.52	155.52
1405994	5657	126	\N	3	90.00	270.00	270.00
1405995	5657	270	\N	2	100.00	200.00	200.00
1405996	5657	163	\N	3	180.00	540.00	540.00
1405997	5657	159	\N	1	106.00	106.00	106.00
1405998	5658	100	\N	2	49.00	98.00	98.00
1405999	5658	442	\N	2	271.43	542.86	542.86
1406000	5658	40	\N	3	160.00	480.00	480.00
1406001	5659	139	\N	1	13.40	13.40	13.40
1406002	5659	202	\N	1	100.00	100.00	100.00
1406003	5659	270	\N	3	100.00	300.00	300.00
1406004	5660	358	\N	2	900.00	1800.00	1800.00
1406005	5660	150	\N	3	220.00	660.00	660.00
1406006	5660	311	\N	3	90.00	270.00	270.00
1406007	5661	326	\N	3	60.00	180.00	180.00
1406008	5661	419	\N	3	332.47	997.41	997.41
1406009	5661	303	\N	3	250.00	750.00	750.00
1406010	5662	292	\N	3	125.00	375.00	375.00
1406011	5662	45	\N	3	80.00	240.00	240.00
1406012	5663	361	\N	1	60.00	60.00	60.00
1406013	5663	88	\N	3	2.00	6.00	6.00
1406014	5663	165	\N	2	79.00	158.00	158.00
1406015	5664	7	\N	3	238.00	714.00	714.00
1406016	5664	222	\N	1	20.00	20.00	20.00
1406017	5664	113	\N	3	1333.80	4001.40	4001.40
1406018	5664	393	\N	3	303.72	911.16	911.16
1406019	5665	426	\N	1	215.51	215.51	215.51
1406020	5666	419	\N	3	332.47	997.41	997.41
1406021	5667	94	\N	3	200.00	600.00	600.00
1406022	5668	227	\N	2	220.00	440.00	440.00
1406023	5668	110	\N	3	2196.40	6589.20	6589.20
1406024	5669	379	\N	1	188.28	188.28	188.28
1406025	5670	446	\N	3	117.50	352.50	352.50
1406026	5670	267	\N	2	100.00	200.00	200.00
1406027	5670	201	\N	2	60.00	120.00	120.00
1406028	5671	355	\N	1	85.00	85.00	85.00
1406029	5671	223	\N	3	20.00	60.00	60.00
1406030	5671	235	\N	1	297.77	297.77	297.77
1406031	5672	215	\N	3	94.00	282.00	282.00
1406032	5672	76	\N	3	10.00	30.00	30.00
1406033	5672	22	\N	3	30.00	90.00	90.00
1406034	5672	326	\N	2	60.00	120.00	120.00
1406035	5673	282	\N	2	40.00	80.00	80.00
1406036	5673	346	\N	3	144.00	432.00	432.00
1406037	5674	206	\N	2	30.00	60.00	60.00
1406038	5674	460	\N	2	51.97	103.94	103.94
1406039	5674	276	\N	3	5.00	15.00	15.00
1406040	5674	209	\N	2	315.00	630.00	630.00
1406041	5675	75	\N	1	10.00	10.00	10.00
1406042	5675	150	\N	3	220.00	660.00	660.00
1406043	5676	118	\N	2	10.00	20.00	20.00
1406044	5676	135	\N	1	26.00	26.00	26.00
1406045	5676	7	\N	3	238.00	714.00	714.00
1406046	5676	395	\N	2	102.31	204.62	204.62
1406047	5677	399	\N	1	55.63	55.63	55.63
1406048	5677	99	\N	1	30.00	30.00	30.00
1406049	5678	411	\N	3	269.44	808.32	808.32
1406050	5678	70	\N	2	70.00	140.00	140.00
1406051	5678	130	\N	3	18.50	55.50	55.50
1406052	5678	18	\N	2	33.00	66.00	66.00
1406053	5679	37	\N	1	340.00	340.00	340.00
1406054	5680	450	\N	3	338.45	1015.35	1015.35
1406055	5680	180	\N	2	1.76	3.52	3.52
1406056	5681	59	\N	1	30.00	30.00	30.00
1406057	5681	66	\N	3	70.00	210.00	210.00
1406058	5681	115	\N	2	1.00	2.00	2.00
1406059	5682	116	\N	2	1.00	2.00	2.00
1406060	5683	107	\N	2	1694.80	3389.60	3389.60
1406061	5683	354	\N	2	150.00	300.00	300.00
1406062	5684	155	\N	2	41.00	82.00	82.00
1406063	5684	221	\N	1	29.00	29.00	29.00
1406064	5684	309	\N	2	115.38	230.76	230.76
1406065	5684	264	\N	2	8.00	16.00	16.00
1406066	5685	128	\N	2	27.74	55.48	55.48
1406067	5685	360	\N	3	164.00	492.00	492.00
1406068	5686	163	\N	2	180.00	360.00	360.00
1406069	5686	457	\N	1	193.48	193.48	193.48
1406070	5687	283	\N	3	100.00	300.00	300.00
1406071	5687	356	\N	1	150.00	150.00	150.00
1406072	5687	273	\N	1	10.00	10.00	10.00
1406073	5688	72	\N	3	1.50	4.50	4.50
1406074	5689	371	\N	2	70.00	140.00	140.00
1406075	5689	336	\N	3	35.50	106.50	106.50
1406076	5689	252	\N	2	47.00	94.00	94.00
1406077	5690	238	\N	1	256.50	256.50	256.50
1406078	5690	448	\N	1	332.45	332.45	332.45
1406079	5691	359	\N	2	80.00	160.00	160.00
1406080	5691	372	\N	1	40.00	40.00	40.00
1406081	5691	296	\N	3	60.00	180.00	180.00
1406082	5692	385	\N	2	204.68	409.36	409.36
1406083	5692	421	\N	1	53.73	53.73	53.73
1406084	5692	355	\N	2	85.00	170.00	170.00
1406085	5693	261	\N	1	2.00	2.00	2.00
1406086	5693	21	\N	1	30.00	30.00	30.00
1406087	5693	92	\N	3	338.00	1014.00	1014.00
1406088	5694	22	\N	1	30.00	30.00	30.00
1406089	5695	251	\N	2	45.00	90.00	90.00
1406090	5695	451	\N	1	348.05	348.05	348.05
1406091	5695	210	\N	1	100.00	100.00	100.00
1406092	5695	28	\N	1	289.00	289.00	289.00
1406093	5696	453	\N	3	282.76	848.28	848.28
1406094	5696	302	\N	2	226.92	453.84	453.84
1406095	5696	229	\N	2	30.00	60.00	60.00
1406096	5697	224	\N	1	30.00	30.00	30.00
1406097	5698	452	\N	2	176.59	353.18	353.18
1406098	5699	36	\N	1	310.00	310.00	310.00
1406099	5699	285	\N	1	100.00	100.00	100.00
1406100	5699	367	\N	3	6.00	18.00	18.00
1406101	5700	38	\N	2	290.00	580.00	580.00
1406102	5701	352	\N	1	25.00	25.00	25.00
1406103	5702	306	\N	1	60.00	60.00	60.00
1406104	5702	456	\N	3	309.29	927.87	927.87
1406105	5702	126	\N	3	90.00	270.00	270.00
1406106	5702	196	\N	3	98.00	294.00	294.00
1406107	5703	184	\N	3	70.00	210.00	210.00
1406108	5703	206	\N	3	30.00	90.00	90.00
1406109	5703	43	\N	2	80.00	160.00	160.00
1406110	5703	450	\N	2	338.45	676.90	676.90
1406111	5704	453	\N	1	282.76	282.76	282.76
1406112	5705	392	\N	3	192.64	577.92	577.92
1406113	5705	226	\N	2	186.00	372.00	372.00
1406114	5706	229	\N	2	30.00	60.00	60.00
1406115	5706	158	\N	1	225.00	225.00	225.00
1406116	5706	425	\N	1	166.23	166.23	166.23
1406117	5707	375	\N	2	15.00	30.00	30.00
1406118	5708	221	\N	3	29.00	87.00	87.00
1406119	5708	415	\N	2	128.31	256.62	256.62
1406120	5708	147	\N	2	145.00	290.00	290.00
1406121	5709	231	\N	3	150.00	450.00	450.00
1406122	5709	189	\N	1	8.00	8.00	8.00
1406123	5710	263	\N	3	10.00	30.00	30.00
1406124	5710	132	\N	1	6.15	6.15	6.15
1406125	5710	337	\N	2	1508.91	3017.82	3017.82
1406126	5710	389	\N	2	159.31	318.62	318.62
1406127	5711	440	\N	3	234.68	704.04	704.04
1406128	5711	278	\N	2	50.00	100.00	100.00
1406129	5711	430	\N	2	229.58	459.16	459.16
1406130	5712	247	\N	1	1026.00	1026.00	1026.00
1406131	5712	184	\N	1	70.00	70.00	70.00
1406132	5713	131	\N	2	5.00	10.00	10.00
1406133	5713	322	\N	1	100.00	100.00	100.00
1406134	5714	43	\N	2	80.00	160.00	160.00
1406135	5714	112	\N	1	1194.00	1194.00	1194.00
1406136	5715	337	\N	3	1508.91	4526.73	4526.73
1406137	5715	112	\N	2	1194.00	2388.00	2388.00
1406138	5715	43	\N	1	80.00	80.00	80.00
1406139	5715	200	\N	2	705.00	1410.00	1410.00
1406140	5716	453	\N	3	282.76	848.28	848.28
1406141	5716	89	\N	1	40.00	40.00	40.00
1406142	5716	67	\N	1	69.90	69.90	69.90
1406143	5717	76	\N	2	10.00	20.00	20.00
1406144	5717	312	\N	3	269.23	807.69	807.69
1406145	5717	106	\N	2	1497.20	2994.40	2994.40
1406146	5717	364	\N	1	285.00	285.00	285.00
1406147	5718	72	\N	2	1.50	3.00	3.00
1406148	5718	259	\N	3	75.00	225.00	225.00
1406149	5718	234	\N	2	951.00	1902.00	1902.00
1406150	5719	241	\N	1	234.00	234.00	234.00
1406151	5719	289	\N	3	25.00	75.00	75.00
1406152	5719	322	\N	1	100.00	100.00	100.00
1406153	5720	333	\N	2	80.00	160.00	160.00
1406154	5720	182	\N	1	95.00	95.00	95.00
1406155	5720	49	\N	2	80.00	160.00	160.00
1406156	5720	314	\N	3	192.31	576.93	576.93
1406157	5721	377	\N	2	6.00	12.00	12.00
1406158	5722	461	\N	1	264.20	264.20	264.20
1406159	5723	57	\N	1	75.00	75.00	75.00
1406160	5723	22	\N	3	30.00	90.00	90.00
1406161	5723	46	\N	3	80.00	240.00	240.00
1406162	5724	157	\N	3	30.00	90.00	90.00
1406163	5724	275	\N	2	980.00	1960.00	1960.00
1406164	5724	329	\N	3	262.00	786.00	786.00
1406165	5724	52	\N	2	75.00	150.00	150.00
1406166	5725	294	\N	2	15.00	30.00	30.00
1406167	5725	190	\N	2	387.50	775.00	775.00
1406168	5726	206	\N	2	30.00	60.00	60.00
1406169	5727	191	\N	2	239.00	478.00	478.00
1406170	5728	342	\N	3	79.19	237.57	237.57
1406171	5728	366	\N	1	40.00	40.00	40.00
1406172	5729	374	\N	2	250.00	500.00	500.00
1406173	5729	193	\N	1	83.00	83.00	83.00
1406174	5729	312	\N	1	269.23	269.23	269.23
1406175	5729	207	\N	1	30.00	30.00	30.00
1406176	5730	360	\N	2	164.00	328.00	328.00
1406177	5730	170	\N	2	61.90	123.80	123.80
1406178	5730	230	\N	3	99.00	297.00	297.00
1406179	5731	162	\N	2	680.00	1360.00	1360.00
1406180	5731	255	\N	2	61.54	123.08	123.08
1406181	5731	13	\N	3	7.00	21.00	21.00
1406182	5731	342	\N	2	79.19	158.38	158.38
1406183	5732	434	\N	2	134.40	268.80	268.80
1406184	5732	15	\N	1	98.00	98.00	98.00
1406185	5733	37	\N	2	340.00	680.00	680.00
1406186	5734	463	\N	3	72.85	218.55	218.55
1406187	5735	239	\N	1	247.50	247.50	247.50
1406188	5735	219	\N	3	390.00	1170.00	1170.00
1406189	5735	142	\N	2	7.00	14.00	14.00
1406190	5736	316	\N	2	120.00	240.00	240.00
1406191	5736	430	\N	3	229.58	688.74	688.74
1406192	5736	380	\N	1	239.10	239.10	239.10
1406193	5736	251	\N	1	45.00	45.00	45.00
1406194	5737	324	\N	3	25.00	75.00	75.00
1406195	5738	317	\N	3	60.00	180.00	180.00
1406196	5738	211	\N	3	160.00	480.00	480.00
1406197	5738	441	\N	1	134.53	134.53	134.53
1406198	5738	161	\N	1	13.20	13.20	13.20
1406199	5739	67	\N	2	69.90	139.80	139.80
1406200	5739	75	\N	3	10.00	30.00	30.00
1406201	5739	459	\N	2	307.79	615.58	615.58
1406202	5740	45	\N	2	80.00	160.00	160.00
1406203	5740	85	\N	2	7.00	14.00	14.00
1406204	5740	189	\N	1	8.00	8.00	8.00
1406205	5740	254	\N	3	153.85	461.55	461.55
1406206	5741	71	\N	1	60.00	60.00	60.00
1406207	5741	165	\N	1	79.00	79.00	79.00
1406208	5742	341	\N	2	297.28	594.56	594.56
1406209	5742	301	\N	2	50.00	100.00	100.00
1406210	5742	454	\N	1	346.32	346.32	346.32
1406211	5742	201	\N	3	60.00	180.00	180.00
1406212	5743	387	\N	2	107.89	215.78	215.78
1406213	5743	202	\N	1	100.00	100.00	100.00
1406214	5743	330	\N	2	650.00	1300.00	1300.00
1406215	5744	285	\N	2	100.00	200.00	200.00
1406216	5744	400	\N	2	194.25	388.50	388.50
1406217	5745	327	\N	1	180.00	180.00	180.00
1406218	5746	146	\N	1	238.00	238.00	238.00
1406219	5746	268	\N	2	250.00	500.00	500.00
1406220	5747	38	\N	2	290.00	580.00	580.00
1406221	5747	392	\N	2	192.64	385.28	385.28
1406222	5747	136	\N	3	75.00	225.00	225.00
1406223	5748	347	\N	2	144.00	288.00	288.00
1406224	5748	154	\N	1	17.00	17.00	17.00
1406225	5748	94	\N	3	200.00	600.00	600.00
1406226	5748	400	\N	3	194.25	582.75	582.75
1406227	5749	335	\N	1	20.00	20.00	20.00
1406228	5749	183	\N	2	95.00	190.00	190.00
1406229	5749	110	\N	3	2196.40	6589.20	6589.20
1406230	5750	294	\N	1	15.00	15.00	15.00
1406231	5750	199	\N	2	1188.00	2376.00	2376.00
1406232	5751	265	\N	3	105.00	315.00	315.00
1406233	5751	373	\N	1	25.00	25.00	25.00
1406234	5751	21	\N	1	30.00	30.00	30.00
1406235	5752	15	\N	2	98.00	196.00	196.00
1406236	5753	91	\N	1	289.00	289.00	289.00
1406237	5754	118	\N	2	10.00	20.00	20.00
1406238	5754	316	\N	3	120.00	360.00	360.00
1406239	5754	295	\N	3	220.00	660.00	660.00
1406240	5754	328	\N	1	115.38	115.38	115.38
1406241	5755	457	\N	1	193.48	193.48	193.48
1406242	5756	17	\N	3	35.50	106.50	106.50
1406243	5756	217	\N	1	51.00	51.00	51.00
1406244	5757	287	\N	1	25.00	25.00	25.00
1406245	5758	323	\N	1	10.00	10.00	10.00
1406246	5759	460	\N	1	51.97	51.97	51.97
1406247	5759	33	\N	3	261.00	783.00	783.00
1406248	5759	292	\N	1	125.00	125.00	125.00
1406249	5759	301	\N	3	50.00	150.00	150.00
1406250	5760	290	\N	1	75.00	75.00	75.00
1406251	5760	26	\N	3	12.00	36.00	36.00
1406252	5761	389	\N	1	159.31	159.31	159.31
1406253	5762	368	\N	1	1041.71	1041.71	1041.71
1406254	5762	434	\N	3	134.40	403.20	403.20
1406255	5763	456	\N	1	309.29	309.29	309.29
1406256	5763	174	\N	2	145.00	290.00	290.00
1406257	5763	152	\N	2	79.00	158.00	158.00
1406258	5764	409	\N	1	262.02	262.02	262.02
1406259	5765	232	\N	1	24.00	24.00	24.00
1406260	5765	75	\N	1	10.00	10.00	10.00
1406261	5765	196	\N	1	98.00	98.00	98.00
1406262	5765	419	\N	2	332.47	664.94	664.94
1406263	5766	403	\N	1	218.79	218.79	218.79
1406264	5766	116	\N	1	1.00	1.00	1.00
1406265	5767	199	\N	3	1188.00	3564.00	3564.00
1406266	5767	215	\N	3	94.00	282.00	282.00
1406267	5767	419	\N	3	332.47	997.41	997.41
1406268	5768	439	\N	3	212.96	638.88	638.88
1406269	5768	295	\N	3	220.00	660.00	660.00
1406270	5768	283	\N	3	100.00	300.00	300.00
1406271	5769	331	\N	1	123.08	123.08	123.08
1406272	5769	220	\N	1	33.00	33.00	33.00
1406273	5769	225	\N	3	40.00	120.00	120.00
1406274	5769	275	\N	1	980.00	980.00	980.00
1406275	5770	424	\N	1	281.73	281.73	281.73
1406276	5771	141	\N	2	38.00	76.00	76.00
1406277	5771	322	\N	3	100.00	300.00	300.00
1406278	5771	418	\N	1	233.93	233.93	233.93
1406279	5771	151	\N	1	9.20	9.20	9.20
1406280	5772	72	\N	3	1.50	4.50	4.50
1406281	5772	452	\N	3	176.59	529.77	529.77
1406282	5773	79	\N	1	30.00	30.00	30.00
1406283	5773	454	\N	1	346.32	346.32	346.32
1406284	5773	434	\N	2	134.40	268.80	268.80
1406285	5773	49	\N	3	80.00	240.00	240.00
1406286	5774	50	\N	3	80.00	240.00	240.00
1406287	5775	249	\N	1	1793.60	1793.60	1793.60
1406288	5775	111	\N	1	1862.00	1862.00	1862.00
1406289	5775	289	\N	1	25.00	25.00	25.00
1406290	5775	183	\N	3	95.00	285.00	285.00
1406291	5776	139	\N	3	13.40	40.20	40.20
1406292	5777	216	\N	2	104.00	208.00	208.00
1406293	5778	194	\N	3	55.00	165.00	165.00
1406294	5778	154	\N	3	17.00	51.00	51.00
1406295	5778	394	\N	2	190.71	381.42	381.42
1406296	5778	200	\N	2	705.00	1410.00	1410.00
1406297	5779	353	\N	2	70.00	140.00	140.00
1406298	5780	134	\N	3	1.00	3.00	3.00
1406299	5780	405	\N	1	318.50	318.50	318.50
1406300	5780	227	\N	2	220.00	440.00	440.00
1406301	5780	73	\N	1	5.00	5.00	5.00
1406302	5781	61	\N	3	85.00	255.00	255.00
1406303	5781	325	\N	2	1923.08	3846.16	3846.16
1406304	5781	202	\N	2	100.00	200.00	200.00
1406305	5782	411	\N	2	269.44	538.88	538.88
1406306	5782	2	\N	2	234.00	468.00	468.00
1406307	5782	263	\N	3	10.00	30.00	30.00
1406308	5782	236	\N	1	297.77	297.77	297.77
1406309	5783	192	\N	2	162.00	324.00	324.00
1406310	5783	15	\N	1	98.00	98.00	98.00
1406311	5783	289	\N	1	25.00	25.00	25.00
1406312	5784	296	\N	2	60.00	120.00	120.00
1406313	5784	168	\N	3	22.00	66.00	66.00
1406314	5785	442	\N	3	271.43	814.29	814.29
1406315	5785	314	\N	1	192.31	192.31	192.31
1406316	5785	77	\N	1	4.00	4.00	4.00
1406317	5786	389	\N	1	159.31	159.31	159.31
1406318	5787	120	\N	3	51.00	153.00	153.00
1406319	5787	392	\N	1	192.64	192.64	192.64
1406320	5787	385	\N	2	204.68	409.36	409.36
1406321	5787	39	\N	2	300.00	600.00	600.00
1406322	5788	156	\N	3	113.00	339.00	339.00
1406323	5789	78	\N	2	10.00	20.00	20.00
1406324	5789	301	\N	2	50.00	100.00	100.00
1406325	5790	142	\N	3	7.00	21.00	21.00
1406326	5790	265	\N	3	105.00	315.00	315.00
1406327	5791	72	\N	2	1.50	3.00	3.00
1406328	5792	197	\N	2	12.00	24.00	24.00
1406329	5792	184	\N	3	70.00	210.00	210.00
1406330	5792	123	\N	3	8.00	24.00	24.00
1406331	5793	456	\N	3	309.29	927.87	927.87
1406332	5793	154	\N	1	17.00	17.00	17.00
1406333	5794	157	\N	2	30.00	60.00	60.00
1406334	5794	384	\N	1	319.11	319.11	319.11
1406335	5795	5	\N	2	300.00	600.00	600.00
1406336	5795	381	\N	1	225.89	225.89	225.89
1406337	5796	274	\N	3	234.00	702.00	702.00
1406338	5797	112	\N	2	1194.00	2388.00	2388.00
1406339	5798	403	\N	2	218.79	437.58	437.58
1406340	5798	350	\N	1	58.50	58.50	58.50
1406341	5799	45	\N	1	80.00	80.00	80.00
1406342	5800	45	\N	1	80.00	80.00	80.00
1406343	5800	297	\N	3	230.77	692.31	692.31
1406344	5801	397	\N	1	220.09	220.09	220.09
1406345	5801	198	\N	2	150.00	300.00	300.00
1406346	5801	268	\N	2	250.00	500.00	500.00
1406347	5802	225	\N	1	40.00	40.00	40.00
1406348	5802	452	\N	3	176.59	529.77	529.77
1406349	5802	163	\N	2	180.00	360.00	360.00
1406350	5802	392	\N	3	192.64	577.92	577.92
1406351	5803	78	\N	2	10.00	20.00	20.00
1406352	5804	176	\N	2	99.00	198.00	198.00
1406353	5804	244	\N	3	776.99	2330.97	2330.97
1406354	5804	106	\N	1	1497.20	1497.20	1497.20
1406355	5804	306	\N	2	60.00	120.00	120.00
1406356	5805	372	\N	1	40.00	40.00	40.00
1406357	5806	391	\N	1	238.07	238.07	238.07
1406358	5806	431	\N	1	312.03	312.03	312.03
1406359	5806	203	\N	2	145.00	290.00	290.00
1406360	5806	249	\N	1	1793.60	1793.60	1793.60
1406361	5807	340	\N	2	820.45	1640.90	1640.90
1406362	5808	152	\N	3	79.00	237.00	237.00
1406363	5809	209	\N	3	315.00	945.00	945.00
1406364	5809	396	\N	3	70.58	211.74	211.74
1406365	5810	62	\N	1	85.80	85.80	85.80
1406366	5810	125	\N	1	10.00	10.00	10.00
1406367	5810	92	\N	2	338.00	676.00	676.00
1406368	5810	98	\N	3	30.00	90.00	90.00
1406369	5811	263	\N	3	10.00	30.00	30.00
1406370	5811	373	\N	2	25.00	50.00	50.00
1406371	5811	256	\N	3	300.00	900.00	900.00
1406372	5811	215	\N	1	94.00	94.00	94.00
1406373	5812	118	\N	3	10.00	30.00	30.00
1406374	5812	456	\N	3	309.29	927.87	927.87
1406375	5812	8	\N	3	70.00	210.00	210.00
1406376	5812	326	\N	3	60.00	180.00	180.00
1406377	5813	219	\N	1	390.00	390.00	390.00
1406378	5813	314	\N	3	192.31	576.93	576.93
1406379	5813	61	\N	1	85.00	85.00	85.00
1406380	5813	407	\N	2	232.24	464.48	464.48
1406381	5814	404	\N	2	288.75	577.50	577.50
1406382	5815	98	\N	2	30.00	60.00	60.00
1406383	5815	402	\N	2	348.38	696.76	696.76
1406384	5815	376	\N	3	127.00	381.00	381.00
1406385	5815	284	\N	2	80.00	160.00	160.00
1406386	5816	163	\N	3	180.00	540.00	540.00
1406387	5816	18	\N	2	33.00	66.00	66.00
1406388	5817	30	\N	1	251.23	251.23	251.23
1406389	5817	235	\N	2	297.77	595.54	595.54
1406390	5818	60	\N	1	12.00	12.00	12.00
1406391	5819	46	\N	2	80.00	160.00	160.00
1406392	5819	337	\N	3	1508.91	4526.73	4526.73
1406393	5819	283	\N	3	100.00	300.00	300.00
1406394	5819	262	\N	2	10.00	20.00	20.00
1406395	5820	21	\N	1	30.00	30.00	30.00
1406396	5820	299	\N	1	153.85	153.85	153.85
1406397	5820	241	\N	3	234.00	702.00	702.00
1406398	5820	10	\N	2	290.00	580.00	580.00
1406399	5821	442	\N	2	271.43	542.86	542.86
1406400	5821	302	\N	1	226.92	226.92	226.92
\.


--
-- Data for Name: supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier (supplier_id, supplier_name, address, email, contact_number, product_supplied, total_orders, status, completed_orders) FROM stdin;
1	Oils and tires	Bagumbong Dulo Caloocan City	sohitado@gmail.com	09388347797	Transmission & Drivetrain	1	Active	1
2	Jvt and cworks products	68 7th ave, Corner C. Cordero St, Grace Park West, Caloocan, 1402 Metro Manila	jvtscooterphil@gmail.com	09178368680	Spareparts	0	Active	0
3	Al Cycle and Lube Center	15 Rainbow Ave, Caloocan, Metro Manila	\N	\N	spare parts and accessories like brake pads, brake shoe, brake and clutch cables etc	0	Active	0
6	Corsa Tires: JKSS tire center	Valenzuela, Philippines, 1440	jksstrading@yahoo.com	09230836830	CORSA MOTORCYCLE TIRES,AMARON MOTORCYCLE Battery,Mobil Lubricants	0	Active	0
5	Dunlop tires: Tireshackk Inc	347 Ortigas Avenue, Greenhills East, Mandaluyong, Philippines, 1554	ti.tireshakk.mktg@gmail.com	09175406116	Tires	0	Active	0
4	 PS Cycle Center	Speedtrail Cycle Center, 18 Miller Avenue, Barangay Bungad, Quezon City, Philippines, 1105	\N	09988870858	Spareparts	0	Active	0
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (setting_key, setting_value, description, updated_at) FROM stdin;
tax_rate	0.03	Current sales tax rate (3%)	2026-04-07 12:03:07.534637
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (user_id, setting_key, setting_value, updated_at) FROM stdin;
2	out_of_stock	t	2026-04-08 05:16:37.016472
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, employee_id, password_hash, full_name, role, is_active, created_date, last_login, username, permissions_json, email, address, password_changed_at) FROM stdin;
5	5	$2b$12$VgRwjBoSFya1PQCA.oFJsO5zH4.0CjctNy/T2s3Mnjk3ez2p7Myri	Cedie logatoc	Manager	f	2026-04-06	2026-04-06	Cedie	{"Reports": ["View", "Generate Report"]}	chrisdennis2204@gmail.com	\N	\N
6	6	$2b$12$RigIcCTGd1LDCnoPEy/N7ew/430fYmjY2pPn1LDPDPBFN1f1HQ/CS	John Doe	Cashier	f	2026-04-07	2026-04-08	Totoyz	{}	harpoon0930@gmail.com	\N	\N
8	8	$2b$12$IzkhpezskE8YftAVt5F4oujDMOeumQsVQYNwxTfa9VHLByCwpKSea	James conde	Administrator	t	2026-04-10	\N	Conde	{"Sales": ["View", "Add", "Edit", "Delete", "Export"], "Orders": ["View", "Add", "Edit", "Delete", "Export"], "Archive": ["View", "Delete"], "Reports": ["View", "Export"], "Products": ["View", "Add", "Edit", "Delete", "Export"], "Audit Log": ["View", "Export"], "Dashboard": ["View", "Export"], "Inventory": ["View", "Add", "Edit", "Delete", "Export"], "Suppliers": ["View", "Add", "Edit", "Delete", "Export"], "Forecasting": ["View", "Export"], "Product Return": ["View", "Process Return", "Edit"], "Purchase Order": ["View", "Create Order", "Edit", "Delete"], "Customer Return": ["View", "Add", "Edit", "Delete", "Export"], "Supplier Return": ["View", "Add", "Edit", "Delete", "Export"], "User Management": ["View", "Add", "Edit", "Delete", "Export"], "Role Permissions": ["View", "Add", "Edit", "Delete", "Export"], "Stock Prediction": ["View", "Export"]}	conde@gmail.com	\N	\N
7	7	$2b$12$phwvMc3i/zwuuzsj.A2ERuvSeRW/XkpSIdSABqCnn2VqCc8Cygmgu	John Rovhic Sohitado	Administrator	t	2026-04-07	2026-04-07	Halcrow01	{}	totoybata9@gmail.com	\N	\N
9	9	$2b$12$bHDUvN2Qj4ehF175s0K0h.XCl6/B3rcLNl7wRGKFD6fckD5ut/kmO	John robek	Cashier	t	2026-04-10	2026-04-10	Cashier	{}	robek@gmail.com	\N	\N
2	2	$2b$12$r75vPN4Scxis19Ad.pXsrOeCghecU89sAnkoFl2E6IJmimD7hEAH2	ROBEK!	administrator	t	2026-03-25	2026-04-10	rootadminnginamo	{}	\N	\N	\N
\.


--
-- Name: analytics_model_runs_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analytics_model_runs_run_id_seq', 768, true);


--
-- Name: auditlog_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditlog_log_id_seq', 37, true);


--
-- Name: customer_return_items_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_return_items_item_id_seq', 13, true);


--
-- Name: customer_returns_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_returns_return_id_seq', 9, true);


--
-- Name: generated_reports_report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.generated_reports_report_id_seq', 5, true);


--
-- Name: inventory_stock_events_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_stock_events_event_id_seq', 44, true);


--
-- Name: lowstockalerts_alert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lowstockalerts_alert_id_seq', 1, false);


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_notification_id_seq', 1, false);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_payment_id_seq', 707, true);


--
-- Name: product_price_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_price_history_history_id_seq', 40, true);


--
-- Name: product_return_items_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_return_items_item_id_seq', 6, true);


--
-- Name: product_returns_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_returns_return_id_seq', 8, true);


--
-- Name: purchase_order_items_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_items_item_id_seq', 3, true);


--
-- Name: reports_report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_report_id_seq', 1, false);


--
-- Name: sales_invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_invoice_id_seq', 5823, true);


--
-- Name: sold_items_sold_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sold_items_sold_item_id_seq', 1406402, true);


--
-- Name: analytics_model_cache analytics_model_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_model_cache
    ADD CONSTRAINT analytics_model_cache_pkey PRIMARY KEY (model_key);


--
-- Name: analytics_model_runs analytics_model_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_model_runs
    ADD CONSTRAINT analytics_model_runs_pkey PRIMARY KEY (run_id);


--
-- Name: auditlog auditlog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditlog
    ADD CONSTRAINT auditlog_pkey PRIMARY KEY (log_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: customer_return_items customer_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_return_items
    ADD CONSTRAINT customer_return_items_pkey PRIMARY KEY (item_id);


--
-- Name: customer_returns customer_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_returns
    ADD CONSTRAINT customer_returns_pkey PRIMARY KEY (return_id);


--
-- Name: customer_returns customer_returns_rma_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_returns
    ADD CONSTRAINT customer_returns_rma_number_key UNIQUE (rma_number);


--
-- Name: generated_reports generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (report_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: inventory_stock_events inventory_stock_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock_events
    ADD CONSTRAINT inventory_stock_events_pkey PRIMARY KEY (event_id);


--
-- Name: lowstockalerts lowstockalerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lowstockalerts
    ADD CONSTRAINT lowstockalerts_pkey PRIMARY KEY (alert_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: pos_terminals pos_terminals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_terminals
    ADD CONSTRAINT pos_terminals_pkey PRIMARY KEY (terminal_id);


--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (history_id);


--
-- Name: product_return_items product_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_return_items
    ADD CONSTRAINT product_return_items_pkey PRIMARY KEY (item_id);


--
-- Name: product_returns product_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_pkey PRIMARY KEY (return_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (item_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (order_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (report_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (invoice_id);


--
-- Name: sold_items sold_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sold_items
    ADD CONSTRAINT sold_items_pkey PRIMARY KEY (sold_item_id);


--
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id, setting_key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_analytics_model_runs_key_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_model_runs_key_time ON public.analytics_model_runs USING btree (model_key, started_at DESC);


--
-- Name: users_username_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_unique ON public.users USING btree (lower((username)::text)) WHERE ((username IS NOT NULL) AND (TRIM(BOTH FROM username) <> ''::text));


--
-- Name: auditlog auditlog_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditlog
    ADD CONSTRAINT auditlog_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: customer_return_items customer_return_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_return_items
    ADD CONSTRAINT customer_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: customer_return_items customer_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_return_items
    ADD CONSTRAINT customer_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.customer_returns(return_id) ON DELETE CASCADE;


--
-- Name: customer_returns customer_returns_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_returns
    ADD CONSTRAINT customer_returns_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales(invoice_id);


--
-- Name: customer_returns customer_returns_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_returns
    ADD CONSTRAINT customer_returns_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(invoice_id);


--
-- Name: products fk_products_supplier; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id);


--
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: inventory_stock_events inventory_stock_events_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock_events
    ADD CONSTRAINT inventory_stock_events_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id) ON DELETE CASCADE;


--
-- Name: inventory_stock_events inventory_stock_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock_events
    ADD CONSTRAINT inventory_stock_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales(invoice_id);


--
-- Name: product_return_items product_return_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_return_items
    ADD CONSTRAINT product_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: product_return_items product_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_return_items
    ADD CONSTRAINT product_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.product_returns(return_id) ON DELETE CASCADE;


--
-- Name: product_returns product_returns_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id);


--
-- Name: purchase_order_items purchase_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.purchase_orders(order_id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id);


--
-- Name: purchase_orders purchase_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: roles roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: sales sales_pos_terminal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pos_terminal_id_fkey FOREIGN KEY (pos_terminal_id) REFERENCES public.pos_terminals(terminal_id);


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: sold_items sold_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sold_items
    ADD CONSTRAINT sold_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales(invoice_id);


--
-- Name: sold_items sold_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sold_items
    ADD CONSTRAINT sold_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1tBSBPYPbAntjqC4JwkWC59gmCIcDTaZgwg7yShwQqkT8fNOORkRLrIRuDS5JIX

