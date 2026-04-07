--
-- PostgreSQL database dump
--

\restrict waMzjVBDZBpmJeOx97FPeCkLAALebqu2wj2kwWkrKDC3LIbyCxfhjYsYtYo4nwc

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
    reason_adjustment text DEFAULT ''::text NOT NULL
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
    failure_reason text
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
    product_supplied character varying(255),
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
-- Name: inventory_stock_events event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock_events ALTER COLUMN event_id SET DEFAULT nextval('public.inventory_stock_events_event_id_seq'::regclass);


--
-- Name: lowstockalerts alert_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lowstockalerts ALTER COLUMN alert_id SET DEFAULT nextval('public.lowstockalerts_alert_id_seq'::regclass);


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
overview	{"generated_at": "2026-04-07T04:03:19.046413+00:00", "forecast_accuracy": 30.33272540237718, "sales_forecast_engine": "prophet", "stock_forecast_engine": "rolling_average"}	prophet	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629	2026-04-07 13:03:19.046423
forecast_30d	{"response": {"series": [{"date": "2026-01-08", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3443.3764658938085, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1229.9094409394902, "trend_component": -1229.9094409394902, "weekly_component": 873.0580326936514}, {"date": "2026-01-09", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2810.0089669113186, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1160.6728178617834, "trend_component": -1160.6728178617834, "weekly_component": 318.7722236968068}, {"date": "2026-01-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 1165.8163902776262, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1091.4361947840766, "trend_component": -1091.4361947840766, "weekly_component": -1199.5916141781959}, {"date": "2026-01-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2355.876394191573, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -1022.19957170637, "trend_component": -1022.19957170637, "weekly_component": -121.10139079245764}, {"date": "2026-01-12", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3722.8359328663687, "actual_sales": 0.0, "forecast_sales": 110.99637483709694, "smoothed_sales": -952.9629486730746, "trend_component": -952.9629486730746, "weekly_component": 1063.9593235101715}, {"date": "2026-01-13", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2203.0875801000334, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -883.7263256397792, "trend_component": -883.7263256397792, "weekly_component": -368.4216616022226}, {"date": "2026-01-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2476.628748875324, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -814.4897026064835, "trend_component": -814.4897026064835, "weekly_component": -566.6749133207499}, {"date": "2026-01-15", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3498.726127691178, "actual_sales": 0.0, "forecast_sales": 127.80495312133428, "smoothed_sales": -745.2530795733193, "trend_component": -745.2530795733193, "weekly_component": 873.0580326946535}, {"date": "2026-01-16", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3531.3006097945836, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -676.016456540155, "trend_component": -676.016456540155, "weekly_component": 318.77222369506205}, {"date": "2026-01-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 1655.5996803121732, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -606.7798335069907, "trend_component": -606.7798335069907, "weekly_component": -1199.591614176931}, {"date": "2026-01-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2977.3357796211853, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -537.5432105448949, "trend_component": -537.5432105448949, "weekly_component": -121.10139079105235}, {"date": "2026-01-19", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4143.71435151801, "actual_sales": 0.0, "forecast_sales": 595.6527359270403, "smoothed_sales": -468.30658758279907, "trend_component": -468.30658758279907, "weekly_component": 1063.9593235098394}, {"date": "2026-01-20", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2670.146239945247, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -399.06996454234684, "trend_component": -399.06996454234684, "weekly_component": -368.4216616033742}, {"date": "2026-01-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2719.2667215850324, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -329.83334150189467, "trend_component": -329.83334150189467, "weekly_component": -566.674913319928}, {"date": "2026-01-22", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4169.60918280731, "actual_sales": 0.0, "forecast_sales": 612.4613142298954, "smoothed_sales": -260.59671846144255, "trend_component": -260.59671846144255, "weekly_component": 873.058032691338}, {"date": "2026-01-23", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3590.7385369868607, "actual_sales": 0.0, "forecast_sales": 127.41212829796382, "smoothed_sales": -191.3600953959721, "trend_component": -191.3600953959721, "weekly_component": 318.7722236939359}, {"date": "2026-01-24", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2141.6836237089165, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -122.12347233050163, "trend_component": -122.12347233050163, "weekly_component": -1199.5916141771265}, {"date": "2026-01-25", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3485.334751317834, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": -52.88684926503104, "trend_component": -52.88684926503104, "weekly_component": -121.1013907894064}, {"date": "2026-01-26", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4751.600925413048, "actual_sales": 0.0, "forecast_sales": 1080.3090972990074, "smoothed_sales": 16.34977378937163, "trend_component": 16.34977378937163, "weekly_component": 1063.9593235096356}, {"date": "2026-01-27", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3178.710551801277, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 85.5863968437743, "trend_component": 85.5863968437743, "weekly_component": -368.4216616045071}, {"date": "2026-01-28", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3409.1152158128984, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 154.82301989817697, "trend_component": 154.82301989817697, "weekly_component": -566.6749133238146}, {"date": "2026-01-29", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4683.741345956574, "actual_sales": 0.0, "forecast_sales": 1097.1176756352386, "smoothed_sales": 224.05964294289865, "trend_component": 224.05964294289865, "weekly_component": 873.0580326923399}, {"date": "2026-01-30", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4121.946003804685, "actual_sales": 0.0, "forecast_sales": 612.0684896804303, "smoothed_sales": 293.2962659876203, "trend_component": 293.2962659876203, "weekly_component": 318.77222369281}, {"date": "2026-01-31", "event_icon": null, "lower_bound": 0.0, "upper_bound": 2777.3117362304547, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 362.532889032342, "trend_component": 362.532889032342, "weekly_component": -1199.5916141776277}, {"date": "2026-02-01", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3943.5613204301544, "actual_sales": 0.0, "forecast_sales": 310.6681212466179, "smoothed_sales": 431.769512034619, "trend_component": 431.769512034619, "weekly_component": -121.10139078800114}, {"date": "2026-02-02", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5114.944905363555, "actual_sales": 0.0, "forecast_sales": 1564.9654585474825, "smoothed_sales": 501.0061350368963, "trend_component": 501.0061350368963, "weekly_component": 1063.9593235105863}, {"date": "2026-02-03", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3445.901982735085, "actual_sales": 0.0, "forecast_sales": 201.82109643351492, "smoothed_sales": 570.2427580391735, "trend_component": 570.2427580391735, "weekly_component": -368.4216616056586}, {"date": "2026-02-04", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3506.001240165665, "actual_sales": 0.0, "forecast_sales": 72.80446779800559, "smoothed_sales": 639.4793811209983, "trend_component": 639.4793811209983, "weekly_component": -566.6749133229927}, {"date": "2026-02-05", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5004.997957871392, "actual_sales": 0.0, "forecast_sales": 1581.7740368956597, "smoothed_sales": 708.7160042028223, "trend_component": 708.7160042028223, "weekly_component": 873.0580326928374}, {"date": "2026-02-06", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4437.586124452259, "actual_sales": 0.0, "forecast_sales": 1096.724850957237, "smoothed_sales": 777.9526272658626, "trend_component": 777.9526272658626, "weekly_component": 318.77222369137456}, {"date": "2026-02-07", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3104.949910812944, "actual_sales": 0.0, "forecast_sales": 0.0, "smoothed_sales": 847.1892503289027, "trend_component": 847.1892503289027, "weekly_component": -1199.5916141775183}, {"date": "2026-02-08", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4251.566219280758, "actual_sales": 0.0, "forecast_sales": 795.3244825970653, "smoothed_sales": 916.425873391943, "trend_component": 916.425873391943, "weekly_component": -121.1013907948777}, {"date": "2026-02-09", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5400.410573212593, "actual_sales": 0.0, "forecast_sales": 2049.621820048873, "smoothed_sales": 985.6624965383619, "trend_component": 985.6624965383619, "weekly_component": 1063.959323510511}, {"date": "2026-02-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4298.530839611599, "actual_sales": 0.0, "forecast_sales": 686.4774580779713, "smoothed_sales": 1054.8991196847812, "trend_component": 1054.8991196847812, "weekly_component": -368.42166160681}, {"date": "2026-02-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4204.280929972412, "actual_sales": 0.0, "forecast_sales": 557.4608295091741, "smoothed_sales": 1124.1357428311999, "trend_component": 1124.1357428311999, "weekly_component": -566.6749133220258}, {"date": "2026-02-12", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5721.811282749075, "actual_sales": 0.0, "forecast_sales": 2066.432226245598, "smoothed_sales": 1193.3741935520106, "trend_component": 1193.3741935520106, "weekly_component": 873.0580326935873}, {"date": "2026-02-13", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5191.237290709969, "actual_sales": 0.0, "forecast_sales": 1581.384867970587, "smoothed_sales": 1262.6126442728212, "trend_component": 1262.6126442728212, "weekly_component": 318.772223697766}, {"date": "2026-02-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 3525.211272108656, "actual_sales": 0.0, "forecast_sales": 132.25948081561273, "smoothed_sales": 1331.8510949936322, "trend_component": 1331.8510949936322, "weekly_component": -1199.5916141780194}, {"date": "2026-02-15", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4883.254521895491, "actual_sales": 0.0, "forecast_sales": 1279.9881549477313, "smoothed_sales": 1401.0895457412037, "trend_component": 1401.0895457412037, "weekly_component": -121.1013907934723}, {"date": "2026-02-16", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6287.051525235982, "actual_sales": 0.0, "forecast_sales": 2534.2873199989544, "smoothed_sales": 1470.3279964887756, "trend_component": 1470.3279964887756, "weekly_component": 1063.959323510179}, {"date": "2026-02-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4643.807218258378, "actual_sales": 0.0, "forecast_sales": 1171.1447856283946, "smoothed_sales": 1539.566447236347, "trend_component": 1539.566447236347, "weekly_component": -368.4216616079522}, {"date": "2026-02-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4545.393593152523, "actual_sales": 0.0, "forecast_sales": 1042.129984702578, "smoothed_sales": 1608.8048980239269, "trend_component": 1608.8048980239269, "weekly_component": -566.6749133213489}, {"date": "2026-02-19", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6237.8245983623, "actual_sales": 0.0, "forecast_sales": 2551.1013815058436, "smoothed_sales": 1678.0433488115066, "trend_component": 1678.0433488115066, "weekly_component": 873.058032694337}, {"date": "2026-02-20", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5288.196110441148, "actual_sales": 0.0, "forecast_sales": 2066.0540232951075, "smoothed_sales": 1747.2817995990863, "trend_component": 1747.2817995990863, "weekly_component": 318.77222369602123}, {"date": "2026-02-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4205.32354206295, "actual_sales": 0.0, "forecast_sales": 616.9286361694346, "smoothed_sales": 1816.520250347955, "trend_component": 1816.520250347955, "weekly_component": -1199.5916141785203}, {"date": "2026-02-22", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5036.668033210813, "actual_sales": 0.0, "forecast_sales": 1764.6573103049973, "smoothed_sales": 1885.7587010968236, "trend_component": 1885.7587010968236, "weekly_component": -121.10139079182647}, {"date": "2026-02-23", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6704.415781529213, "actual_sales": 0.0, "forecast_sales": 3018.9564754051007, "smoothed_sales": 1954.9971518951252, "trend_component": 1954.9971518951252, "weekly_component": 1063.9593235099753}, {"date": "2026-02-24", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5322.234570516398, "actual_sales": 0.0, "forecast_sales": 1655.813941090625, "smoothed_sales": 2024.2356026934262, "trend_component": 2024.2356026934262, "weekly_component": -368.4216616028014}, {"date": "2026-02-25", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5037.193772103688, "actual_sales": 0.0, "forecast_sales": 1526.7991401666377, "smoothed_sales": 2093.4740534917282, "trend_component": 2093.4740534917282, "weekly_component": -566.6749133250904}, {"date": "2026-02-26", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6318.112659756117, "actual_sales": 1920.51, "forecast_sales": 3035.770536969196, "smoothed_sales": 2162.7125042741095, "trend_component": 2162.7125042741095, "weekly_component": 873.0580326950868}, {"date": "2026-02-27", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6062.423045568292, "actual_sales": 7193.65, "forecast_sales": 2550.7231787513865, "smoothed_sales": 2231.9509550564912, "trend_component": 2231.9509550564912, "weekly_component": 318.7722236948953}, {"date": "2026-02-28", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4710.960709605953, "actual_sales": 4570.17, "forecast_sales": 1101.5977916601562, "smoothed_sales": 2301.189405838872, "trend_component": 2301.189405838872, "weekly_component": -1199.5916141787159}, {"date": "2026-03-01", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5677.57770934127, "actual_sales": 0.0, "forecast_sales": 2249.3264657733716, "smoothed_sales": 2370.427856571834, "trend_component": 2370.427856571834, "weekly_component": -121.10139079846235}, {"date": "2026-03-02", "event_icon": null, "lower_bound": 17.783357855060732, "upper_bound": 6734.170071744453, "actual_sales": 9540.08, "forecast_sales": 3503.6256308145666, "smoothed_sales": 2439.666307304795, "trend_component": 2439.666307304795, "weekly_component": 1063.9593235097716}, {"date": "2026-03-03", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5463.902156822099, "actual_sales": 901.25, "forecast_sales": 2140.4830964338225, "smoothed_sales": 2508.904758037757, "trend_component": 2508.904758037757, "weekly_component": -368.4216616039344}, {"date": "2026-03-04", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5769.237985200365, "actual_sales": 5501.93, "forecast_sales": 2011.4682955315875, "smoothed_sales": 2578.143208856001, "trend_component": 2578.143208856001, "weekly_component": -566.6749133244135}, {"date": "2026-03-05", "event_icon": null, "lower_bound": 7.996459716164948, "upper_bound": 6891.274725552138, "actual_sales": 9742.03, "forecast_sales": 3520.439692369829, "smoothed_sales": 2647.381659674245, "trend_component": 2647.381659674245, "weekly_component": 873.0580326955843}, {"date": "2026-03-06", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6782.856153277807, "actual_sales": 2523.74, "forecast_sales": 3035.3923341859495, "smoothed_sales": 2716.62011049249, "trend_component": 2716.62011049249, "weekly_component": 318.7722236934598}, {"date": "2026-03-07", "event_icon": null, "lower_bound": 0.0, "upper_bound": 4921.068679544897, "actual_sales": 1308.43, "forecast_sales": 1586.266947107151, "smoothed_sales": 2785.858561284602, "trend_component": 2785.858561284602, "weekly_component": -1199.5916141774508}, {"date": "2026-03-08", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6313.86835421074, "actual_sales": 3698.15, "forecast_sales": 2733.995621279897, "smoothed_sales": 2855.0970120767133, "trend_component": 2855.0970120767133, "weekly_component": -121.10139079681652}, {"date": "2026-03-09", "event_icon": null, "lower_bound": 469.6258805396686, "upper_bound": 7418.101251879447, "actual_sales": 6891.94, "forecast_sales": 3988.294786378394, "smoothed_sales": 2924.3354628688257, "trend_component": 2924.3354628688257, "weekly_component": 1063.959323509568}, {"date": "2026-03-10", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6101.297309667282, "actual_sales": 4512.12, "forecast_sales": 2625.1522520479675, "smoothed_sales": 2993.5739136530533, "trend_component": 2993.5739136530533, "weekly_component": -368.42166160508594}, {"date": "2026-03-11", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6010.021615671004, "actual_sales": 0.0, "forecast_sales": 2496.1374511138342, "smoothed_sales": 3062.812364437281, "trend_component": 3062.812364437281, "weekly_component": -566.6749133234466}, {"date": "2026-03-12", "event_icon": null, "lower_bound": 567.771545095346, "upper_bound": 7386.450102804133, "actual_sales": 9961.19, "forecast_sales": 4005.108847894367, "smoothed_sales": 3132.050815201846, "trend_component": 3132.050815201846, "weekly_component": 873.058032692521}, {"date": "2026-03-13", "event_icon": null, "lower_bound": 131.18694412188137, "upper_bound": 7114.884754178269, "actual_sales": 5817.57, "forecast_sales": 3520.0614896584366, "smoothed_sales": 3201.289265966412, "trend_component": 3201.289265966412, "weekly_component": 318.7722236920244}, {"date": "2026-03-14", "event_icon": null, "lower_bound": 0.0, "upper_bound": 5516.859290846486, "actual_sales": 500.58, "forecast_sales": 2070.9361025536373, "smoothed_sales": 3270.5277167309787, "trend_component": 3270.5277167309787, "weekly_component": -1199.5916141773414}, {"date": "2026-03-15", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6730.881090819412, "actual_sales": 323.9, "forecast_sales": 3218.664776733641, "smoothed_sales": 3339.7661675292925, "trend_component": 3339.7661675292925, "weekly_component": -121.1013907956517}, {"date": "2026-03-16", "event_icon": null, "lower_bound": 889.4613015664098, "upper_bound": 7775.578173954339, "actual_sales": 1271.56, "forecast_sales": 4472.9639418368415, "smoothed_sales": 3409.0046183276054, "trend_component": 3409.0046183276054, "weekly_component": 1063.9593235092361}, {"date": "2026-03-17", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6616.613066688215, "actual_sales": 2294.27, "forecast_sales": 3109.821407519692, "smoothed_sales": 3478.24306912592, "trend_component": 3478.24306912592, "weekly_component": -368.4216616062281}, {"date": "2026-03-18", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6495.254206444281, "actual_sales": 10.3, "forecast_sales": 2980.8066065351777, "smoothed_sales": 3547.481519857657, "trend_component": 3547.481519857657, "weekly_component": -566.6749133224795}, {"date": "2026-03-19", "event_icon": null, "lower_bound": 1172.1393151285356, "upper_bound": 7790.443275009076, "actual_sales": 6037.38, "forecast_sales": 4489.778003282414, "smoothed_sales": 3616.719970589395, "trend_component": 3616.719970589395, "weekly_component": 873.0580326930185}, {"date": "2026-03-20", "event_icon": null, "lower_bound": 380.7230315691397, "upper_bound": 7459.0758947277955, "actual_sales": 9014.6, "forecast_sales": 4004.73064501172, "smoothed_sales": 3685.958421321131, "trend_component": 3685.958421321131, "weekly_component": 318.772223690589}, {"date": "2026-03-21", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6050.244637572016, "actual_sales": 761.09, "forecast_sales": 2555.605257834882, "smoothed_sales": 3755.1968720127243, "trend_component": 3755.1968720127243, "weekly_component": -1199.591614177842}, {"date": "2026-03-22", "event_icon": null, "lower_bound": 343.29034008994967, "upper_bound": 7142.617852144986, "actual_sales": 5370.2, "forecast_sales": 3703.3339319103115, "smoothed_sales": 3824.4353227043175, "trend_component": 3824.4353227043175, "weekly_component": -121.10139079400592}, {"date": "2026-03-23", "event_icon": null, "lower_bound": 1423.8033837081982, "upper_bound": 8822.698187770613, "actual_sales": 2224.85, "forecast_sales": 4957.633096906227, "smoothed_sales": 3893.673773395912, "trend_component": 3893.673773395912, "weekly_component": 1063.9593235103148}, {"date": "2026-03-24", "event_icon": null, "lower_bound": 202.39306462716473, "upper_bound": 7147.074131277118, "actual_sales": 8176.06, "forecast_sales": 3594.4905624864364, "smoothed_sales": 3962.9122240875045, "trend_component": 3962.9122240875045, "weekly_component": -368.421661601068}, {"date": "2026-03-25", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6775.716297894139, "actual_sales": 0.0, "forecast_sales": 3465.475761457295, "smoothed_sales": 4032.1506747790977, "trend_component": 4032.1506747790977, "weekly_component": -566.6749133218027}, {"date": "2026-03-26", "event_icon": null, "lower_bound": 1640.4628757425762, "upper_bound": 8207.306584787459, "actual_sales": 2134.78, "forecast_sales": 4974.447158164711, "smoothed_sales": 4101.3891254706905, "trend_component": 4101.3891254706905, "weekly_component": 873.0580326940205}, {"date": "2026-03-27", "event_icon": null, "lower_bound": 1096.6603710330103, "upper_bound": 7866.999210279023, "actual_sales": 1430.67, "forecast_sales": 4489.399799851747, "smoothed_sales": 4170.627576162284, "trend_component": 4170.627576162284, "weekly_component": 318.7722236894629}, {"date": "2026-03-28", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6117.228704647646, "actual_sales": 319.3, "forecast_sales": 3040.2744126773005, "smoothed_sales": 4239.866026853878, "trend_component": 4239.866026853878, "weekly_component": -1199.5916141765772}, {"date": "2026-03-29", "event_icon": null, "lower_bound": 409.7293975769551, "upper_bound": 7610.450895383248, "actual_sales": 7658.93, "forecast_sales": 4188.003086753111, "smoothed_sales": 4309.104477545471, "trend_component": 4309.104477545471, "weekly_component": -121.1013907923599}, {"date": "2026-03-30", "event_icon": null, "lower_bound": 1685.906045017555, "upper_bound": 8762.955418712461, "actual_sales": 813.7, "forecast_sales": 5442.302251747047, "smoothed_sales": 4378.342928237064, "trend_component": 4378.342928237064, "weekly_component": 1063.9593235099828}, {"date": "2026-03-31", "event_icon": null, "lower_bound": 358.3841887796739, "upper_bound": 7778.278420344615, "actual_sales": 4220.23, "forecast_sales": 4079.159717326447, "smoothed_sales": 4447.581378928658, "trend_component": 4447.581378928658, "weekly_component": -368.42166160221024}, {"date": "2026-04-01", "event_icon": null, "lower_bound": 510.2318683732887, "upper_bound": 7452.530728662013, "actual_sales": 9884.05, "forecast_sales": 3950.144916299415, "smoothed_sales": 4516.819829620251, "trend_component": 4516.819829620251, "weekly_component": -566.6749133208358}, {"date": "2026-04-02", "event_icon": null, "lower_bound": 1944.0964732238951, "upper_bound": 8911.465411431209, "actual_sales": 3350.96, "forecast_sales": 5459.116313006362, "smoothed_sales": 4586.058280311844, "trend_component": 4586.058280311844, "weekly_component": 873.0580326945183}, {"date": "2026-04-03", "event_icon": null, "lower_bound": 1232.4138510328096, "upper_bound": 8431.862997072087, "actual_sales": 859.54, "forecast_sales": 4974.068954698982, "smoothed_sales": 4655.296731003437, "trend_component": 4655.296731003437, "weekly_component": 318.7722236955451}, {"date": "2026-04-04", "event_icon": null, "lower_bound": 0.0, "upper_bound": 6816.720174107545, "actual_sales": 539.72, "forecast_sales": 3524.943567517952, "smoothed_sales": 4724.535181695031, "trend_component": 4724.535181695031, "weekly_component": -1199.5916141770788}, {"date": "2026-04-05", "event_icon": null, "lower_bound": 1203.3728591699094, "upper_bound": 8578.216007771682, "actual_sales": 5866.88, "forecast_sales": 4672.672241595428, "smoothed_sales": 4793.773632386624, "trend_component": 4793.773632386624, "weekly_component": -121.10139079119531}, {"date": "2026-04-06", "event_icon": null, "lower_bound": 2246.5675811464944, "upper_bound": 9567.291295344705, "actual_sales": 18480.13, "forecast_sales": 5926.971406588124, "smoothed_sales": 4863.012083078217, "trend_component": 4863.012083078217, "weekly_component": 1063.9593235099076}, {"date": "2026-04-07", "event_icon": null, "lower_bound": 1292.0896540317976, "upper_bound": 7987.884487362589, "actual_sales": 1395.65, "forecast_sales": 4563.828872166458, "smoothed_sales": 4932.25053376981, "trend_component": 4932.25053376981, "weekly_component": -368.42166160335245}, {"date": "2026-04-08", "event_icon": "ai_predicted", "lower_bound": 1059.9155673681082, "upper_bound": 8093.841591004506, "actual_sales": null, "forecast_sales": 4434.814071136681, "smoothed_sales": 5001.488984461404, "trend_component": null, "weekly_component": null}, {"date": "2026-04-09", "event_icon": "ai_predicted", "lower_bound": 2431.2899984662577, "upper_bound": 9424.855256956434, "actual_sales": null, "forecast_sales": 5943.785467848013, "smoothed_sales": 5070.727435152997, "trend_component": null, "weekly_component": null}, {"date": "2026-04-10", "event_icon": "ai_predicted", "lower_bound": 1732.3240088058417, "upper_bound": 8882.928249001578, "actual_sales": null, "forecast_sales": 5458.7381095387, "smoothed_sales": 5139.96588584459, "trend_component": null, "weekly_component": null}, {"date": "2026-04-11", "event_icon": "ai_predicted", "lower_bound": 592.7915204884655, "upper_bound": 7478.7702164368575, "actual_sales": null, "forecast_sales": 4009.612722358911, "smoothed_sales": 5209.204336536185, "trend_component": null, "weekly_component": null}, {"date": "2026-04-12", "event_icon": "ai_predicted", "lower_bound": 1403.6800592751406, "upper_bound": 8751.801211511813, "actual_sales": null, "forecast_sales": 5157.341396438226, "smoothed_sales": 5278.442787227776, "trend_component": null, "weekly_component": null}, {"date": "2026-04-13", "event_icon": "ai_predicted", "lower_bound": 3197.1153705229044, "upper_bound": 9960.240099872995, "actual_sales": null, "forecast_sales": 6411.640561428946, "smoothed_sales": 5347.681237919371, "trend_component": null, "weekly_component": null}, {"date": "2026-04-14", "event_icon": "ai_predicted", "lower_bound": 1649.4036846639565, "upper_bound": 8632.664863667545, "actual_sales": null, "forecast_sales": 5048.49802700647, "smoothed_sales": 5416.919688610964, "trend_component": null, "weekly_component": null}, {"date": "2026-04-15", "event_icon": "ai_predicted", "lower_bound": 1531.5967455544471, "upper_bound": 8711.918432354256, "actual_sales": null, "forecast_sales": 4919.483225978802, "smoothed_sales": 5486.158139302557, "trend_component": null, "weekly_component": null}, {"date": "2026-04-16", "event_icon": "ai_predicted", "lower_bound": 2844.988198024196, "upper_bound": 9879.317624443689, "actual_sales": null, "forecast_sales": 6428.454622690168, "smoothed_sales": 5555.39658999415, "trend_component": null, "weekly_component": null}, {"date": "2026-04-17", "event_icon": "ai_predicted", "lower_bound": 2690.673669463754, "upper_bound": 9409.02825397775, "actual_sales": null, "forecast_sales": 5943.407264378108, "smoothed_sales": 5624.635040685744, "trend_component": null, "weekly_component": null}, {"date": "2026-04-18", "event_icon": "ai_predicted", "lower_bound": 880.9582975873312, "upper_bound": 8010.985612114386, "actual_sales": null, "forecast_sales": 4494.281877199866, "smoothed_sales": 5693.873491377337, "trend_component": null, "weekly_component": null}, {"date": "2026-04-19", "event_icon": "ai_predicted", "lower_bound": 2192.1972786992296, "upper_bound": 9089.742714285016, "actual_sales": null, "forecast_sales": 5642.010551272745, "smoothed_sales": 5763.11194206893, "trend_component": null, "weekly_component": null}, {"date": "2026-04-20", "event_icon": "ai_predicted", "lower_bound": 3543.5285609808952, "upper_bound": 10105.716794603615, "actual_sales": null, "forecast_sales": 6896.309716271306, "smoothed_sales": 5832.3503927605225, "trend_component": null, "weekly_component": null}, {"date": "2026-04-21", "event_icon": "ai_predicted", "lower_bound": 2099.9221501266074, "upper_bound": 9031.699716269783, "actual_sales": null, "forecast_sales": 5533.167181846469, "smoothed_sales": 5901.588843452116, "trend_component": null, "weekly_component": null}, {"date": "2026-04-22", "event_icon": "ai_predicted", "lower_bound": 1936.836552475683, "upper_bound": 9090.491073605299, "actual_sales": null, "forecast_sales": 5404.152380820776, "smoothed_sales": 5970.827294143709, "trend_component": null, "weekly_component": null}, {"date": "2026-04-23", "event_icon": "ai_predicted", "lower_bound": 3338.10280769393, "upper_bound": 10540.915423404975, "actual_sales": null, "forecast_sales": 6913.123777531819, "smoothed_sales": 6040.065744835303, "trend_component": null, "weekly_component": null}, {"date": "2026-04-24", "event_icon": "ai_predicted", "lower_bound": 2653.3021960542133, "upper_bound": 9946.99841642306, "actual_sales": null, "forecast_sales": 6428.076419225653, "smoothed_sales": 6109.304195526896, "trend_component": null, "weekly_component": null}, {"date": "2026-04-25", "event_icon": "ai_predicted", "lower_bound": 1695.142759793442, "upper_bound": 8417.81730334677, "actual_sales": null, "forecast_sales": 4978.951032040824, "smoothed_sales": 6178.54264621849, "trend_component": null, "weekly_component": null}, {"date": "2026-04-26", "event_icon": "ai_predicted", "lower_bound": 2606.087220951241, "upper_bound": 9452.94493089895, "actual_sales": null, "forecast_sales": 6126.679706115543, "smoothed_sales": 6247.781096910083, "trend_component": null, "weekly_component": null}, {"date": "2026-04-27", "event_icon": "ai_predicted", "lower_bound": 3924.806373089423, "upper_bound": 10794.1050036011, "actual_sales": null, "forecast_sales": 7380.978871112127, "smoothed_sales": 6317.019547601676, "trend_component": null, "weekly_component": null}, {"date": "2026-04-28", "event_icon": "ai_predicted", "lower_bound": 2803.8655669011146, "upper_bound": 9059.42895814842, "actual_sales": null, "forecast_sales": 6017.83633668649, "smoothed_sales": 6386.257998293268, "trend_component": null, "weekly_component": null}, {"date": "2026-04-29", "event_icon": "ai_predicted", "lower_bound": 2591.874746635904, "upper_bound": 9623.062060248763, "actual_sales": null, "forecast_sales": 5888.82153566275, "smoothed_sales": 6455.496448984862, "trend_component": null, "weekly_component": null}, {"date": "2026-04-30", "event_icon": "ai_predicted", "lower_bound": 3858.5856051929118, "upper_bound": 10933.645080936423, "actual_sales": null, "forecast_sales": 7397.792932369907, "smoothed_sales": 6524.734899676455, "trend_component": null, "weekly_component": null}, {"date": "2026-05-01", "event_icon": "ai_predicted", "lower_bound": 3313.866464776247, "upper_bound": 10541.502000565904, "actual_sales": null, "forecast_sales": 6912.74557406537, "smoothed_sales": 6593.973350368049, "trend_component": null, "weekly_component": null}, {"date": "2026-05-02", "event_icon": "ai_predicted", "lower_bound": 2237.2000505604033, "upper_bound": 9072.713289473457, "actual_sales": null, "forecast_sales": 5463.620186881477, "smoothed_sales": 6663.211801059643, "trend_component": null, "weekly_component": null}, {"date": "2026-05-03", "event_icon": "ai_predicted", "lower_bound": 3051.3528221572024, "upper_bound": 10010.796900668134, "actual_sales": null, "forecast_sales": 6611.348860958103, "smoothed_sales": 6732.4502517512365, "trend_component": null, "weekly_component": null}, {"date": "2026-05-04", "event_icon": "ai_predicted", "lower_bound": 4311.1446200388455, "upper_bound": 11106.566848688528, "actual_sales": null, "forecast_sales": 7865.648025952948, "smoothed_sales": 6801.68870244283, "trend_component": null, "weekly_component": null}, {"date": "2026-05-05", "event_icon": "ai_predicted", "lower_bound": 3227.39563970298, "upper_bound": 9867.772718879638, "actual_sales": null, "forecast_sales": 6502.505491532795, "smoothed_sales": 6870.927153134423, "trend_component": null, "weekly_component": null}, {"date": "2026-05-06", "event_icon": "ai_predicted", "lower_bound": 2774.051193898504, "upper_bound": 9945.927689893853, "actual_sales": null, "forecast_sales": 6373.4906905047255, "smoothed_sales": 6940.165603826015, "trend_component": null, "weekly_component": null}, {"date": "2026-05-07", "event_icon": "ai_predicted", "lower_bound": 4457.262722185151, "upper_bound": 11679.9041771992, "actual_sales": null, "forecast_sales": 7882.46208721181, "smoothed_sales": 7009.4040545176085, "trend_component": null, "weekly_component": null}], "model_status": null, "forecast_engine": "prophet", "trend_direction": "up", "forecast_accuracy": 30.33272540237718, "product_forecasts": [{"confidence": 0.7, "product_id": 1, "reorder_by": null, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 2, "reorder_by": null, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 3, "reorder_by": null, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 4, "reorder_by": null, "product_name": "HONDA GOLD 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 5, "reorder_by": null, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 7, "reorder_by": null, "product_name": "HONDA RED 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 8, "reorder_by": null, "product_name": "HONDA GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 9, "reorder_by": null, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 10, "reorder_by": null, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 11, "reorder_by": null, "product_name": "WD-40 333ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 12, "reorder_by": null, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 14, "reorder_by": null, "product_name": "GASKET MAKER PITSTOP 30G", "current_stock": 0, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 16, "reorder_by": null, "product_name": "CVT FI CLEANER PRO 450ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 21, "reorder_by": null, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 22, "reorder_by": null, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 23, "reorder_by": null, "product_name": "OIL FILTER HJLX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 24, "reorder_by": null, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 25, "reorder_by": null, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 28, "reorder_by": null, "product_name": "MOTUL SCT 800ML", "current_stock": 0, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 29, "reorder_by": null, "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 18, "reorder_by": null, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 19, "reorder_by": null, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 20, "reorder_by": null, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 15, "reorder_by": null, "product_name": "CVT CLEANER RS8", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 101.25000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.7, "product_id": 13, "reorder_by": null, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 17, "reorder_by": null, "product_name": "FORK OIL GENERIC", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 6, "reorder_by": null, "product_name": "HONDA BLUE 1L", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 90.00000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.7, "product_id": 27, "reorder_by": null, "product_name": "BEARING KOYO 6004", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 26, "reorder_by": null, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 180.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 303, "reorder_by": null, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 227, "reorder_by": null, "product_name": "AIR FILTER KLX140", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 376, "reorder_by": null, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 270.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 30, "reorder_by": null, "product_name": "ZIC M9 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 31, "reorder_by": null, "product_name": "ZIC M9 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.2, "product_id": 32, "reorder_by": null, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 33, "reorder_by": null, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 34, "reorder_by": null, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 35, "reorder_by": null, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 36, "reorder_by": null, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 37, "reorder_by": null, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 38, "reorder_by": null, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 39, "reorder_by": null, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 40, "reorder_by": null, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 41, "reorder_by": null, "product_name": "PETRON SR200 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 42, "reorder_by": null, "product_name": "BEARING KOYO 6005", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.2, "product_id": 43, "reorder_by": null, "product_name": "BEARING KOYO 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 44, "reorder_by": null, "product_name": "BEARING KOYO 6201", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 45, "reorder_by": null, "product_name": "BEARING KOYO 6202", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 46, "reorder_by": null, "product_name": "BEARING KOYO 6203", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 47, "reorder_by": null, "product_name": "BEARING KOYO 6204", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 48, "reorder_by": null, "product_name": "BEARING KOYO 6205", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 49, "reorder_by": null, "product_name": "BEARING KOYO 6300", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 50, "reorder_by": null, "product_name": "BEARING KOYO 6301", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 51, "reorder_by": null, "product_name": "BEARING KOYO 6302", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 52, "reorder_by": null, "product_name": "BEARING NSK 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 53, "reorder_by": null, "product_name": "BEARING NSK 6302", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 54, "reorder_by": null, "product_name": "BEARING NSK 6004", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 55, "reorder_by": null, "product_name": "BEARING KSR 6200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 56, "reorder_by": null, "product_name": "BEARING KSR 6204", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 57, "reorder_by": null, "product_name": "KSR 6004", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 58, "reorder_by": null, "product_name": "KSR 6005", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 59, "reorder_by": null, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 60, "reorder_by": null, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 61, "reorder_by": null, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 62, "reorder_by": null, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 63, "reorder_by": null, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 64, "reorder_by": null, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 65, "reorder_by": null, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 66, "reorder_by": null, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 67, "reorder_by": null, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 68, "reorder_by": null, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 69, "reorder_by": null, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 100.0, "predicted_demand_30d": 3.0}, {"confidence": 0.2, "product_id": 70, "reorder_by": null, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 71, "reorder_by": null, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 72, "reorder_by": null, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 73, "reorder_by": null, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 74, "reorder_by": null, "product_name": "DOMINO SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 75, "reorder_by": null, "product_name": "STARTER SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 76, "reorder_by": null, "product_name": "BRAKE SWITCH L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.2, "product_id": 77, "reorder_by": null, "product_name": "BRAKE SWITCH R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 78, "reorder_by": null, "product_name": "ON/OFF SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 79, "reorder_by": null, "product_name": "HORN SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 80, "reorder_by": null, "product_name": "HAZARD SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 81, "reorder_by": null, "product_name": "H/L SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 82, "reorder_by": null, "product_name": "HOLLOW SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 83, "reorder_by": null, "product_name": "L/R SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 84, "reorder_by": null, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 85, "reorder_by": null, "product_name": "PITO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 86, "reorder_by": null, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 87, "reorder_by": null, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 88, "reorder_by": null, "product_name": "ALLEN BOLT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 89, "reorder_by": null, "product_name": "HORN RELAY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.2, "product_id": 90, "reorder_by": null, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 91, "reorder_by": null, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 92, "reorder_by": null, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 93, "reorder_by": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 94, "reorder_by": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 95, "reorder_by": null, "product_name": "FORK OIL SEAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 96, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 97, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 98, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 315, "reorder_by": null, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "reorder_level": 5, "days_to_stockout": 210.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 307, "reorder_by": null, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 144.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 99, "reorder_by": null, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 100, "reorder_by": null, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 101, "reorder_by": null, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.2, "product_id": 102, "reorder_by": null, "product_name": "FUSE 10A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 103, "reorder_by": null, "product_name": "FUSE 15A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.2, "product_id": 104, "reorder_by": null, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 105, "reorder_by": null, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 106, "reorder_by": null, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 107, "reorder_by": null, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 108, "reorder_by": null, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 109, "reorder_by": null, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_id": 110, "reorder_by": null, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 111, "reorder_by": null, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 112, "reorder_by": null, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 113, "reorder_by": null, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 114, "reorder_by": null, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 115, "reorder_by": null, "product_name": "WASHER 10", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 116, "reorder_by": null, "product_name": "WASHER 12", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 117, "reorder_by": null, "product_name": "WASHER 14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 118, "reorder_by": null, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 119, "reorder_by": null, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 120, "reorder_by": null, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 121, "reorder_by": null, "product_name": "EXHAUST GASKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 122, "reorder_by": null, "product_name": "PASAK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 123, "reorder_by": null, "product_name": "FLARINGS SCREW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 124, "reorder_by": null, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 125, "reorder_by": null, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 127, "reorder_by": null, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 128, "reorder_by": null, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 129, "reorder_by": null, "product_name": "CP HOLDER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 130, "reorder_by": null, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 131, "reorder_by": null, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 132, "reorder_by": null, "product_name": "GRASA KOBY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 133, "reorder_by": null, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 134, "reorder_by": null, "product_name": "WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 135, "reorder_by": null, "product_name": "BRAKE PAD M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 136, "reorder_by": null, "product_name": "COOLANT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 137, "reorder_by": null, "product_name": "REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 138, "reorder_by": null, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 139, "reorder_by": null, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 140, "reorder_by": null, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 141, "reorder_by": null, "product_name": "THROTTLE CABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 142, "reorder_by": null, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 143, "reorder_by": null, "product_name": "O-RING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 144, "reorder_by": null, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 145, "reorder_by": null, "product_name": "HORN SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 146, "reorder_by": null, "product_name": "HORN HELLA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 147, "reorder_by": null, "product_name": "STARTER RELAY MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 148, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 149, "reorder_by": null, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 150, "reorder_by": null, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 151, "reorder_by": null, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 154, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 155, "reorder_by": null, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 156, "reorder_by": null, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 157, "reorder_by": null, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 158, "reorder_by": null, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 159, "reorder_by": null, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 160, "reorder_by": null, "product_name": "HORN BOSCH 190", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 161, "reorder_by": null, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 162, "reorder_by": null, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 163, "reorder_by": null, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 164, "reorder_by": null, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 165, "reorder_by": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 166, "reorder_by": null, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 167, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 168, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 169, "reorder_by": null, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 170, "reorder_by": null, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 171, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 172, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 173, "reorder_by": null, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 174, "reorder_by": null, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 175, "reorder_by": null, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 176, "reorder_by": null, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 177, "reorder_by": null, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 178, "reorder_by": null, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 179, "reorder_by": null, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 180, "reorder_by": null, "product_name": "FUSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 181, "reorder_by": null, "product_name": "STARTER RELAY XR200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 182, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 183, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 184, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 185, "reorder_by": null, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 186, "reorder_by": null, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 187, "reorder_by": null, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 188, "reorder_by": null, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 190, "reorder_by": null, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 191, "reorder_by": null, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 192, "reorder_by": null, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 193, "reorder_by": null, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 194, "reorder_by": null, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 195, "reorder_by": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 196, "reorder_by": null, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 197, "reorder_by": null, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 198, "reorder_by": null, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 199, "reorder_by": null, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 200, "reorder_by": null, "product_name": "FUEL COCK CB400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 201, "reorder_by": null, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 202, "reorder_by": null, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 203, "reorder_by": null, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 204, "reorder_by": null, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 205, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 126, "reorder_by": null, "product_name": "ABETA GREY", "current_stock": 7, "reorder_level": 5, "days_to_stockout": 315.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 206, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 207, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 208, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 209, "reorder_by": null, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 100.0, "predicted_demand_30d": 3.0}, {"confidence": 0.2, "product_id": 210, "reorder_by": null, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 211, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 212, "reorder_by": null, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 213, "reorder_by": null, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 214, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 215, "reorder_by": null, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 216, "reorder_by": null, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 217, "reorder_by": null, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 218, "reorder_by": null, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 219, "reorder_by": null, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 220, "reorder_by": null, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 221, "reorder_by": null, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 222, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 223, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 224, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 225, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 226, "reorder_by": null, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 228, "reorder_by": null, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 229, "reorder_by": null, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 230, "reorder_by": null, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 231, "reorder_by": null, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 232, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 233, "reorder_by": null, "product_name": "CABLE TIE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 234, "reorder_by": null, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 235, "reorder_by": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 236, "reorder_by": null, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 237, "reorder_by": null, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 238, "reorder_by": null, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 239, "reorder_by": null, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 240, "reorder_by": null, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 241, "reorder_by": null, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 242, "reorder_by": null, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 243, "reorder_by": null, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 244, "reorder_by": null, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 245, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 246, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 247, "reorder_by": null, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_id": 248, "reorder_by": null, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 249, "reorder_by": null, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 250, "reorder_by": null, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 251, "reorder_by": null, "product_name": "TIRE SEALANT BR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 252, "reorder_by": null, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 253, "reorder_by": null, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 254, "reorder_by": null, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 255, "reorder_by": null, "product_name": "GEAR OIL PETRON", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 256, "reorder_by": null, "product_name": "RS8 R9 1L", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 257, "reorder_by": null, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 258, "reorder_by": null, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 259, "reorder_by": null, "product_name": "CLUTCH LEVER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 260, "reorder_by": null, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 261, "reorder_by": null, "product_name": "NUT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 262, "reorder_by": null, "product_name": "BOLT STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 263, "reorder_by": null, "product_name": "NUT STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 264, "reorder_by": null, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 265, "reorder_by": null, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 266, "reorder_by": null, "product_name": "STEEL NUT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 267, "reorder_by": null, "product_name": "WELDING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 268, "reorder_by": null, "product_name": "REGULATOR BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 269, "reorder_by": null, "product_name": "USED OIL 1DRUM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 270, "reorder_by": null, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 271, "reorder_by": null, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 273, "reorder_by": null, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 274, "reorder_by": null, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 275, "reorder_by": null, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 276, "reorder_by": null, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 277, "reorder_by": null, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 278, "reorder_by": null, "product_name": "HANDLE GRIP *", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 281, "reorder_by": null, "product_name": "PETRON SCT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 282, "reorder_by": null, "product_name": "O-RING CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 283, "reorder_by": null, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 284, "reorder_by": null, "product_name": "INTERIOR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 285, "reorder_by": null, "product_name": "OIL SEAL 200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 286, "reorder_by": null, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 287, "reorder_by": null, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 293, "reorder_by": null, "product_name": "BATTERY CHARGING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 294, "reorder_by": null, "product_name": "RELAY SOCKET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 295, "reorder_by": null, "product_name": "DID CHAIN 428H", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 297, "reorder_by": null, "product_name": "CDI 300", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 298, "reorder_by": null, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 299, "reorder_by": null, "product_name": "CLUTCH SPRING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 300, "reorder_by": null, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 302, "reorder_by": null, "product_name": "PETRON SC400", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 305, "reorder_by": null, "product_name": "AREGULATOR LAM9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 308, "reorder_by": null, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 309, "reorder_by": null, "product_name": "BRAKE CABLE 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 311, "reorder_by": null, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 312, "reorder_by": null, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 313, "reorder_by": null, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 314, "reorder_by": null, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 316, "reorder_by": null, "product_name": "CLUTCH LINING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 317, "reorder_by": null, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 318, "reorder_by": null, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 292, "reorder_by": null, "product_name": "ROTOR DISC", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 291, "reorder_by": null, "product_name": "DIODE", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 180.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 290, "reorder_by": null, "product_name": "INTERIOR 2.75", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 162.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 279, "reorder_by": null, "product_name": "ACOOLANT", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 310, "reorder_by": null, "product_name": "AINTERIOR KRX", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 304, "reorder_by": null, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 405.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 319, "reorder_by": null, "product_name": "CARBON BRUSH 120", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 320, "reorder_by": null, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 321, "reorder_by": null, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 325, "reorder_by": null, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 326, "reorder_by": null, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 327, "reorder_by": null, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 328, "reorder_by": null, "product_name": "BRAKE PAD 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 329, "reorder_by": null, "product_name": "HONDA SCT GREY", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 330, "reorder_by": null, "product_name": "SPROCKET SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 331, "reorder_by": null, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 332, "reorder_by": null, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 333, "reorder_by": null, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 334, "reorder_by": null, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 335, "reorder_by": null, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 336, "reorder_by": null, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 337, "reorder_by": null, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 338, "reorder_by": null, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 339, "reorder_by": null, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 340, "reorder_by": null, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 341, "reorder_by": null, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 342, "reorder_by": null, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 343, "reorder_by": null, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 344, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 345, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 346, "reorder_by": null, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 347, "reorder_by": null, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 348, "reorder_by": null, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 349, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 350, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 351, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 352, "reorder_by": null, "product_name": "BEARING KOYO 6002", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 353, "reorder_by": null, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 354, "reorder_by": null, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 355, "reorder_by": null, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 356, "reorder_by": null, "product_name": "IGNITION COIL KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 357, "reorder_by": null, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 358, "reorder_by": null, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 359, "reorder_by": null, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 360, "reorder_by": null, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 361, "reorder_by": null, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 362, "reorder_by": null, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 363, "reorder_by": null, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 364, "reorder_by": null, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 365, "reorder_by": null, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 366, "reorder_by": null, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 367, "reorder_by": null, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 368, "reorder_by": null, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 369, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 370, "reorder_by": null, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 371, "reorder_by": null, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 372, "reorder_by": null, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 373, "reorder_by": null, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 374, "reorder_by": null, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 375, "reorder_by": null, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 377, "reorder_by": null, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 378, "reorder_by": null, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 379, "reorder_by": null, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 380, "reorder_by": null, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 381, "reorder_by": null, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 382, "reorder_by": null, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 383, "reorder_by": null, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 385, "reorder_by": null, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 386, "reorder_by": null, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 387, "reorder_by": null, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 388, "reorder_by": null, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 389, "reorder_by": null, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 390, "reorder_by": null, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 391, "reorder_by": null, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 392, "reorder_by": null, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 393, "reorder_by": null, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 394, "reorder_by": null, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 395, "reorder_by": null, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.2, "product_id": 396, "reorder_by": null, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 397, "reorder_by": null, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 398, "reorder_by": null, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 399, "reorder_by": null, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 400, "reorder_by": null, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 401, "reorder_by": null, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 402, "reorder_by": null, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 403, "reorder_by": null, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 404, "reorder_by": null, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 405, "reorder_by": null, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 406, "reorder_by": null, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 407, "reorder_by": null, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 408, "reorder_by": null, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 409, "reorder_by": null, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 410, "reorder_by": null, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 411, "reorder_by": null, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 412, "reorder_by": null, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 413, "reorder_by": null, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 414, "reorder_by": null, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 415, "reorder_by": null, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 416, "reorder_by": null, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 417, "reorder_by": null, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 418, "reorder_by": null, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 419, "reorder_by": null, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 420, "reorder_by": null, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 421, "reorder_by": null, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 422, "reorder_by": null, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.2, "product_id": 423, "reorder_by": null, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 424, "reorder_by": null, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.2, "product_id": 426, "reorder_by": null, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 427, "reorder_by": null, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_id": 428, "reorder_by": null, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 322, "reorder_by": null, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 324, "reorder_by": null, "product_name": "A6300", "current_stock": 7, "reorder_level": 5, "days_to_stockout": 105.0, "predicted_demand_30d": 2.0}, {"confidence": 0.2, "product_id": 429, "reorder_by": null, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 430, "reorder_by": null, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 431, "reorder_by": null, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 432, "reorder_by": null, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 433, "reorder_by": null, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 434, "reorder_by": null, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 435, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 436, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 437, "reorder_by": null, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 438, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 439, "reorder_by": null, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 440, "reorder_by": null, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 441, "reorder_by": null, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 442, "reorder_by": null, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.2, "product_id": 444, "reorder_by": null, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 445, "reorder_by": null, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_id": 446, "reorder_by": null, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_id": 447, "reorder_by": null, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 448, "reorder_by": null, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 449, "reorder_by": null, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.2, "product_id": 450, "reorder_by": null, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 451, "reorder_by": null, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 452, "reorder_by": null, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 453, "reorder_by": null, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 454, "reorder_by": null, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 455, "reorder_by": null, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "reorder_level": 5, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.2, "product_id": 456, "reorder_by": null, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 457, "reorder_by": null, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 458, "reorder_by": null, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 459, "reorder_by": null, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 460, "reorder_by": null, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 461, "reorder_by": null, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 462, "reorder_by": null, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 463, "reorder_by": null, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.2, "product_id": 464, "reorder_by": null, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "reorder_level": 5, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_id": 443, "reorder_by": null, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 323, "reorder_by": null, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 301, "reorder_by": null, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 120.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_id": 153, "reorder_by": null, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 425, "reorder_by": null, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_id": 280, "reorder_by": null, "product_name": "AJVT GEAR OIL", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 306, "reorder_by": null, "product_name": "AKRX TUBE", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 296, "reorder_by": null, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "reorder_level": 5, "days_to_stockout": 72.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_id": 288, "reorder_by": null, "product_name": "AXLE EHE TMX", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_id": 189, "reorder_by": null, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "reorder_level": 5, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_id": 272, "reorder_by": null, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "reorder_level": 5, "days_to_stockout": 36.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_id": 152, "reorder_by": "2026-04-10", "product_name": "AIR FILTER CLICK125", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_id": 384, "reorder_by": "2026-04-10", "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "reorder_level": 5, "days_to_stockout": 0.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_id": 289, "reorder_by": null, "product_name": "ADD OIL PETRON", "current_stock": 3, "reorder_level": 5, "days_to_stockout": 45.0, "predicted_demand_30d": 2.0}], "served_from_cache": false, "cache_generated_at": null, "next_period_forecast": 180469.77870406653}, "generated_at": "2026-04-07T04:03:19.046413+00:00", "forecast_days": 90}	prophet	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629	2026-04-07 13:03:19.046423
stock_prediction	{"response": {"risk_stats": {"low_risk": 456, "high_risk": 7, "medium_risk": 1, "avg_days_to_stockout": 404.6}, "model_status": null, "risk_analysis": [{"confidence": 0.7, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HONDA GOLD 1L", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HONDA RED 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HONDA GEAR OIL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "WD-40 333ML", "current_stock": 0, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "GASKET MAKER PITSTOP 30G", "current_stock": 0, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CVT FI CLEANER PRO 450ML", "current_stock": 0, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER HJLX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "MOTUL SCT 800ML", "current_stock": 0, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "CVT CLEANER RS8", "current_stock": 9, "days_to_stockout": 101.25000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.7, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "FORK OIL GENERIC", "current_stock": 9, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "HONDA BLUE 1L", "current_stock": 8, "days_to_stockout": 90.00000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.7, "product_name": "BEARING KOYO 6004", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "days_to_stockout": 180.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "AIR FILTER KLX140", "current_stock": 9, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "days_to_stockout": 270.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "ZIC M9 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ZIC M9 1L", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.15, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PETRON SR200 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6005", "current_stock": 10, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.15, "product_name": "BEARING KOYO 6200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6201", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6202", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6203", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6204", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "BEARING KOYO 6205", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6300", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6301", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6302", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING NSK 6200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING NSK 6302", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING NSK 6004", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BEARING KSR 6200", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BEARING KSR 6204", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "KSR 6004", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "KSR 6005", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "days_to_stockout": 100.0, "predicted_demand_30d": 3.0}, {"confidence": 0.15, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "DOMINO SWITCH", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "STARTER SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SWITCH L", "current_stock": 10, "days_to_stockout": 112.50000000000001, "predicted_demand_30d": 2.6666666666666665}, {"confidence": 0.15, "product_name": "BRAKE SWITCH R", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ON/OFF SWITCH", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "HORN SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HAZARD SWITCH", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "H/L SWITCH", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "HOLLOW SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "L/R SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "PITO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "ALLEN BOLT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HORN RELAY", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.15, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FORK OIL SEAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "days_to_stockout": 210.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "days_to_stockout": 144.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.15, "product_name": "FUSE 10A", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUSE 15A", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.15, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WASHER 10", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "WASHER 12", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WASHER 14", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "EXHAUST GASKET", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "PASAK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FLARINGS SCREW", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "CP HOLDER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "GRASA KOBY", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "WASHER", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE PAD M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "COOLANT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "REPAIR KIT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "THROTTLE CABLE", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "O-RING", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "HORN SOCKET", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "HORN HELLA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "STARTER RELAY MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "HORN BOSCH 190", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUSE", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "STARTER RELAY XR200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUEL COCK CB400", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ABETA GREY", "current_stock": 7, "days_to_stockout": 315.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "days_to_stockout": 100.0, "predicted_demand_30d": 3.0}, {"confidence": 0.15, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CABLE TIE", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "TIRE SEALANT BR", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "GEAR OIL PETRON", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "RS8 R9 1L", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH LEVER", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "NUT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BOLT STAINLESS", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "NUT STAINLESS", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "STEEL NUT", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "WELDING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "REGULATOR BARAKO", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "USED OIL 1DRUM", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "HANDLE GRIP *", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PETRON SCT", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "O-RING CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "INTERIOR", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "OIL SEAL 200", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BATTERY CHARGING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "RELAY SOCKET", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "DID CHAIN 428H", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CDI 300", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "CLUTCH SPRING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "PETRON SC400", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "AREGULATOR LAM9", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE CABLE 150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH LINING", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "ROTOR DISC", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "DIODE", "current_stock": 8, "days_to_stockout": 180.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "INTERIOR 2.75", "current_stock": 9, "days_to_stockout": 162.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "ACOOLANT", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "AINTERIOR KRX", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "days_to_stockout": 405.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "CARBON BRUSH 120", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD 150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HONDA SCT GREY", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPROCKET SET", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BEARING KOYO 6002", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "IGNITION COIL KHC", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.15, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "days_to_stockout": 225.00000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.15, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.15, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "days_to_stockout": 128.57142857142856, "predicted_demand_30d": 2.3333333333333335}, {"confidence": 0.7, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "days_to_stockout": 450.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "A6300", "current_stock": 7, "days_to_stockout": 105.0, "predicted_demand_30d": 2.0}, {"confidence": 0.15, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.15, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "days_to_stockout": 180.0, "predicted_demand_30d": 1.6666666666666667}, {"confidence": 0.7, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "days_to_stockout": 300.0, "predicted_demand_30d": 1.0}, {"confidence": 0.7, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "days_to_stockout": 150.0, "predicted_demand_30d": 2.0}, {"confidence": 0.15, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "days_to_stockout": 900.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.15, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.15, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "days_to_stockout": null, "predicted_demand_30d": 0.0}, {"confidence": 0.7, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "days_to_stockout": 120.0, "predicted_demand_30d": 2.0}, {"confidence": 0.7, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "days_to_stockout": 360.00000000000006, "predicted_demand_30d": 0.6666666666666666}, {"confidence": 0.7, "product_name": "AJVT GEAR OIL", "current_stock": 9, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "AKRX TUBE", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "days_to_stockout": 72.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_name": "AXLE EHE TMX", "current_stock": 9, "days_to_stockout": 810.0000000000001, "predicted_demand_30d": 0.3333333333333333}, {"confidence": 0.7, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "days_to_stockout": 202.50000000000003, "predicted_demand_30d": 1.3333333333333333}, {"confidence": 0.7, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "days_to_stockout": 36.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_name": "AIR FILTER CLICK125", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "days_to_stockout": 0.0, "predicted_demand_30d": 3.3333333333333335}, {"confidence": 0.7, "product_name": "ADD OIL PETRON", "current_stock": 3, "days_to_stockout": 45.0, "predicted_demand_30d": 2.0}], "critical_items": [{"product_name": "WD-40 333ML", "days_to_stockout": null, "recommended_order": 5}, {"product_name": "GASKET MAKER PITSTOP 30G", "days_to_stockout": null, "recommended_order": 5}, {"product_name": "CVT FI CLEANER PRO 450ML", "days_to_stockout": null, "recommended_order": 5}, {"product_name": "MOTUL SCT 800ML", "days_to_stockout": null, "recommended_order": 5}, {"product_name": "MOTUL GP MATIC 1L", "days_to_stockout": null, "recommended_order": 5}, {"product_name": "AIR FILTER CLICK125", "days_to_stockout": 0.0, "recommended_order": 8}, {"product_name": "ADD OIL PETRON / RACERX 200M", "days_to_stockout": 0.0, "recommended_order": 8}], "forecast_engine": "rolling_average", "served_from_cache": false, "cache_generated_at": null, "horizon_predictions": [{"urgency": "Low", "stock_30d": 4.166666666666667, "stock_60d": 2.8333333333333335, "stock_90d": 1.5000000000000004, "product_id": 1, "product_name": "YAMALUBE BLUE CORE 1L", "current_stock": 5, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 2, "product_name": "YAMALUBE AT 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 3, "product_name": "YAMALUBE GEAR OIL 100ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 4, "product_name": "HONDA GOLD 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 5, "product_name": "HONDA BLUE SCT 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 7, "product_name": "HONDA RED 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 8, "product_name": "HONDA GEAR OIL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 9, "product_name": "YAMALUBE PERFORMANCE 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 10, "product_name": "YAMALUBE BUSINESS 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.5, "stock_60d": 0.5, "stock_90d": 0.5, "product_id": 11, "product_name": "WD-40 333ML", "current_stock": 0, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 12, "product_name": "TOP 1 HIGH TEMP GREASE", "current_stock": 10, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.5, "stock_60d": 0.5, "stock_90d": 0.5, "product_id": 14, "product_name": "GASKET MAKER PITSTOP 30G", "current_stock": 0, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.5, "stock_60d": 0.5, "stock_90d": 0.5, "product_id": 16, "product_name": "CVT FI CLEANER PRO 450ML", "current_stock": 0, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 21, "product_name": "OIL FILTER YAMAHA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 22, "product_name": "OIL FILTER KAWASAKI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 23, "product_name": "OIL FILTER HJLX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 24, "product_name": "OIL FILTER LOFILTRO HF183", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 25, "product_name": "OIL FILTER VIC C-806", "current_stock": 10, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.5, "stock_60d": 0.5, "stock_90d": 0.5, "product_id": 28, "product_name": "MOTUL SCT 800ML", "current_stock": 0, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.5, "stock_60d": 0.5, "stock_90d": 0.5, "product_id": 29, "product_name": "MOTUL GP MATIC 1L", "current_stock": 0, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 18, "product_name": "FUEL FILTER AEROX 155", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 19, "product_name": "FUEL FILTER CLICK XRM", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 20, "product_name": "OIL FILTER BAJAJ", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.833333333333334, "stock_60d": 4.166666666666667, "stock_90d": 1.5000000000000009, "product_id": 15, "product_name": "CVT CLEANER RS8", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 13, "product_name": "GREASE HIGH TEMP KOBY", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666668, "stock_60d": 6.833333333333334, "stock_90d": 5.5, "product_id": 17, "product_name": "FORK OIL GENERIC", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.833333333333334, "stock_60d": 3.166666666666667, "stock_90d": 0.5000000000000009, "product_id": 6, "product_name": "HONDA BLUE 1L", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 27, "product_name": "BEARING KOYO 6004", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.166666666666667, "stock_60d": 5.833333333333334, "stock_90d": 4.5, "product_id": 26, "product_name": "HEAD LIGHT BULB MAKOTO", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 303, "product_name": "AFLYBALL MTRT MIO", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666668, "stock_60d": 6.833333333333334, "stock_90d": 5.5, "product_id": 227, "product_name": "AIR FILTER KLX140", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 7.5, "stock_90d": 6.5, "product_id": 376, "product_name": "AIR FILTER NMAX V2", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 30, "product_name": "ZIC M9 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 31, "product_name": "ZIC M9 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 32, "product_name": "CASTROL ACTIV 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 33, "product_name": "SUZUKI ECSTAR 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 34, "product_name": "SHELL ADVANCE AX7 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 35, "product_name": "SHELL ADVANCE AX5 4T 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 36, "product_name": "TOP 1 GREEN ACTION MATIC 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 37, "product_name": "TOP 1 GREEN ACTION MATIC 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 38, "product_name": "TOP 1 VIOLET MC 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 39, "product_name": "TOP 1 VIOLET MC 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 40, "product_name": "PETRON MULTI-GRADE 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 41, "product_name": "PETRON SR200 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333334, "stock_60d": 5.166666666666667, "stock_90d": 2.500000000000001, "product_id": 42, "product_name": "BEARING KOYO 6005", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 43, "product_name": "BEARING KOYO 6200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 44, "product_name": "BEARING KOYO 6201", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 45, "product_name": "BEARING KOYO 6202", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 46, "product_name": "BEARING KOYO 6203", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 47, "product_name": "BEARING KOYO 6204", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 48, "product_name": "BEARING KOYO 6205", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 49, "product_name": "BEARING KOYO 6300", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 50, "product_name": "BEARING KOYO 6301", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 51, "product_name": "BEARING KOYO 6302", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 52, "product_name": "BEARING NSK 6200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 53, "product_name": "BEARING NSK 6302", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 54, "product_name": "BEARING NSK 6004", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 55, "product_name": "BEARING KSR 6200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 56, "product_name": "BEARING KSR 6204", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 57, "product_name": "KSR 6004", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 58, "product_name": "KSR 6005", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 59, "product_name": "OIL FILTER SUZUKI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 60, "product_name": "TAIL LIGHT BULB MAKOTO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 61, "product_name": "SPARK PLUG NGK C6HSA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 62, "product_name": "SPARK PLUG NGK C7HSA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 63, "product_name": "SPARK PLUG NGK CPR6EA-9", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 64, "product_name": "SPARK PLUG DENSO U24ES-N", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 65, "product_name": "SPARK PLUG DENSO W22FS-US", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 66, "product_name": "SPARK PLUG DENSO W24ES-US", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 67, "product_name": "SPARK PLUG DENSO X20FS-U", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 68, "product_name": "SPARK PLUG DENSO X24ES-U", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.5, "stock_60d": 4.5, "stock_90d": 1.5, "product_id": 69, "product_name": "R8 TIRE SEALANT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 70, "product_name": "TIRE SEALANT KOBY", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 71, "product_name": "BRAKE FLUID DOT3 NATIONAL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 72, "product_name": "PEANUT BULB ORANGE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 73, "product_name": "PEANUT BULB WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 74, "product_name": "DOMINO SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 75, "product_name": "STARTER SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333334, "stock_60d": 5.166666666666667, "stock_90d": 2.500000000000001, "product_id": 76, "product_name": "BRAKE SWITCH L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 77, "product_name": "BRAKE SWITCH R", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 78, "product_name": "ON/OFF SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 79, "product_name": "HORN SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 80, "product_name": "HAZARD SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 81, "product_name": "H/L SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 82, "product_name": "HOLLOW SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 83, "product_name": "L/R SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 84, "product_name": "NITTO ELECTRICAL TAPE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 85, "product_name": "PITO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 86, "product_name": "FUEL HOSE RED per feet", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 87, "product_name": "FUEL HOSE BLACK PER FT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 88, "product_name": "ALLEN BOLT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 89, "product_name": "HORN RELAY", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 90, "product_name": "FLASHER RELAY (PAG)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 91, "product_name": "YAMAHA BELT 2DP-E7641-00", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 92, "product_name": "HONDA BELT / CLICK 23100-K35-V01", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 93, "product_name": "JVT FLYBALL 15G - PCX/CLICK/ADV", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 94, "product_name": "YAKIMOTO FLYBALL 10G - MIO125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 95, "product_name": "FORK OIL SEAL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 96, "product_name": "BRAKE PAD YAMAKOTO SHOGUN 125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 97, "product_name": "BRAKE PAD YAMAKOTO CLICK125/150", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 98, "product_name": "BRAKE PAD YAMAKOTO BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 5.5, "stock_90d": 4.5, "product_id": 315, "product_name": "ABEARING KOYO 6303", "current_stock": 7, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.833333333333333, "stock_60d": 5.166666666666666, "stock_90d": 3.5, "product_id": 307, "product_name": "ABRAKE PAD CLICK", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 99, "product_name": "BRAKE PAD - RAIDER 150", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 100, "product_name": "HORN RELAY 4 PIN TRANSPARENT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 101, "product_name": "HORN RELAY 5 PIN TRANSPARENT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 102, "product_name": "FUSE 10A", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 103, "product_name": "FUSE 15A", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 104, "product_name": "GLASS FUSE - 15A", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 105, "product_name": "CHAIN LOCK 428H", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 106, "product_name": "CORSA CROSS S 90/90-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 107, "product_name": "CORSA CROSS S 100/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 108, "product_name": "CORSA CROSS S 110/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 109, "product_name": "CORSA CROSS S 70/90-17", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 110, "product_name": "CORSA CROSS S 100/80-17", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 111, "product_name": "CORSA R26 100/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 112, "product_name": "CORSA S33 80/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 113, "product_name": "CORSA R26 80/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 114, "product_name": "CORSA R26 90/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 115, "product_name": "WASHER 10", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 116, "product_name": "WASHER 12", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 117, "product_name": "WASHER 14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 118, "product_name": "YUNXIN O-RING 1", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 119, "product_name": "YUNXIN O-RING 3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 120, "product_name": "CLUTCH CABLE TMX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 121, "product_name": "EXHAUST GASKET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 122, "product_name": "PASAK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 123, "product_name": "FLARINGS SCREW", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 124, "product_name": "RUBBER DUMPER (SNIPER)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 125, "product_name": "FUEL FILTER UNIVERSAL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 127, "product_name": "YAMAHA GENUINE BRAKE PADS 2DP-F5805-00", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 128, "product_name": "PLATINUM FORK OIL 200ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 129, "product_name": "CP HOLDER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 130, "product_name": "SPARKO 1101 LIQUID GASKET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 131, "product_name": "SIDE MIRROR ADAPTOR HONDA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 132, "product_name": "GRASA KOBY", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 133, "product_name": "ELECTRICAL TAPE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 134, "product_name": "WASHER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 135, "product_name": "BRAKE PAD M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 136, "product_name": "COOLANT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 137, "product_name": "REPAIR KIT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 138, "product_name": "TAIL LIGHT BULB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 139, "product_name": "HEAD LIGHT BULB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 140, "product_name": "TIRE SEALANT KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 141, "product_name": "THROTTLE CABLE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 142, "product_name": "STAINLESS SCREW WITH WASHER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 143, "product_name": "O-RING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 144, "product_name": "BRAKE PAD HONDA B6H", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 145, "product_name": "HORN SOCKET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 146, "product_name": "HORN HELLA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 147, "product_name": "STARTER RELAY MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 148, "product_name": "BRAKE PAD YAMAKOTO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 149, "product_name": "BALL RACE GEAR/GRAVIS", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 150, "product_name": "TTGR REGULATOR RUSI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 151, "product_name": "FUSE BOX WITH FUSE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 154, "product_name": "BRAKE MASTER REPAIR KIT XRM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 155, "product_name": "THROTTLE CABLE OTAKA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 156, "product_name": "CDI LIFAN 4 PIN HONGXIN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 157, "product_name": "RUBBER DUMPER WAVE 125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 158, "product_name": "BRAKE SHOE HONDA CLICK V1 GENUINE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 159, "product_name": "SIDE MIRROR HONDA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 160, "product_name": "HORN BOSCH 190", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 161, "product_name": "FUEL HOSE GREY PER FOOT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 162, "product_name": "RACING CARBURETOR KEIHIN 28MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 163, "product_name": "BRAKE MASTER MRP SKYDRIVE125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 164, "product_name": "BRAKE MASTER BEAT BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 165, "product_name": "HEAD LIGHT LED SUPER BRIGHT T19 WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 166, "product_name": "HEAD LIGHT LED SUPER BRIGHT MDL KILLER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 167, "product_name": "BOLT MUSHROOM TYPE 5X15 SILVER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 168, "product_name": "BOLT MUSHROOM TYPE 5X15 TITANIUM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 169, "product_name": "BOLT MUSHROOM TYPE 5X15 GOLD", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 170, "product_name": "SPARK PLUG DENSO U22FS-U", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 171, "product_name": "PARK LIGHT T15 PAIR WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 172, "product_name": "PARK LIGHT T15 PAIR BLUE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 173, "product_name": "PARK LIGHT T15 PAIR YELLOW", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 174, "product_name": "BRAKE PAD HONDA CLICK FRONT GENUINE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 175, "product_name": "BRAKE PAD HONDA CRF150 REAR", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 176, "product_name": "BRAKE SHOE MTR CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 177, "product_name": "OIL SEAL PULLEY SIDE NMAX/AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 178, "product_name": "BODY CLIP WITH BOLT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 179, "product_name": "SLIDER PIECE HONDA CLICK PCX ADV", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 180, "product_name": "FUSE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 181, "product_name": "STARTER RELAY XR200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 182, "product_name": "BRAKE PAD YAMAHA MIO SPORTY F", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 183, "product_name": "BRAKE PAD YAMAHA AEROX F", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 184, "product_name": "BRAKE MASTER REPAIR KIT YAMAHA MIO M3 AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 185, "product_name": "BRAKE SWITCH UNIVERSAL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 186, "product_name": "PEANUT BULT T13 UNIVERSAL WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 187, "product_name": "PEANUT BULT T13 UNIVERSAL ORANGE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 188, "product_name": "FUEL PUMP FLOATER HONDA BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 190, "product_name": "OVERHAUL GASKET SET CB400", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 191, "product_name": "CLUTCH CABLE CB400", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 192, "product_name": "CARBURETOR DIAPHRAGM CB400 SET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 193, "product_name": "CARBON BRUSH WAVE 125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 194, "product_name": "FUEL PUMP O-RING BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 195, "product_name": "REGULATOR RECTIFIER SKYDRIVE CARB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 196, "product_name": "GEAR BOX YAMAHA 5TL MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 197, "product_name": "OIL FILTER YAMAHA P12", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 198, "product_name": "BRAKE CABLE CLICK 125 RR MAKOTO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 199, "product_name": "FUEL PUMP ASSEMBLY HONDA BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 200, "product_name": "FUEL COCK CB400", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 201, "product_name": "OIL SEAL AXLE DRIVE MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 202, "product_name": "AIR FILTER YAMAHA MIO GRAVIS GEAR", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 203, "product_name": "AIR FILTER PCX ADV", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 204, "product_name": "BELT YAMAHA 5TL MIO SPORTY NOVO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 205, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI F", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.833333333333333, "stock_60d": 6.166666666666667, "stock_90d": 5.5, "product_id": 126, "product_name": "ABETA GREY", "current_stock": 7, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 206, "product_name": "BRAKE PAD YAMAKOTO RAIDER 150 FI R", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 207, "product_name": "BRAKE PAD YAMAKOTO PCX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 208, "product_name": "BRAKE PAD YAMAKOTO MIO M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.5, "stock_60d": 4.5, "stock_90d": 1.5, "product_id": 209, "product_name": "BALLRACE BEARING YAMAHA MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 210, "product_name": "BALLRACE BEARING KRYON CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 211, "product_name": "BRAKE PAD YAMAHA SNIPER R", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 212, "product_name": "BELT HONDA BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 213, "product_name": "ELECTRICAL TAPE NITTO 33", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 214, "product_name": "BRAKE PAD YAMAHA SNIPER F", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 215, "product_name": "BRAKE SHOE OTAKA BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 216, "product_name": "BRAKE SHOE OTAKA MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 217, "product_name": "CLUTCH CABLE OTAKA BARAKO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 218, "product_name": "THROTTLE CABLE OTAKA TMX155", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 219, "product_name": "BELT HONDA PCX ADV CLICK 160", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 220, "product_name": "FUEL FILTER BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 221, "product_name": "CLUTCH CABLE BARAKO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 222, "product_name": "BRAKE MASTER REPAIR KIT BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 223, "product_name": "BRAKE MASTER REPAIR KIT CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 224, "product_name": "BRAKE PAD YAMAKOTO XRM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 225, "product_name": "BRAKE MASTER REPAIR KIT HONDA BEAT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 226, "product_name": "CARBURETOR RUBBER HOSE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 228, "product_name": "RUBBER DUMPER KHC XRM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 229, "product_name": "RUBBER DUMPER KHC WAVE125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 230, "product_name": "STARTER RELAY TMX125 RUSI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 231, "product_name": "BALLRACE SUNTAL GEAR/GRAVIS/FAZZIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 232, "product_name": "BRAKE PAD YAMAKOTO SHOGUN F", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 233, "product_name": "CABLE TIE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 234, "product_name": "CLUTCH SHOE ONLY JVT SET M3/NMAX/AEROX/CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 235, "product_name": "FLYBALL JVT CLICK/PCX/ADV 13G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 236, "product_name": "FLYBALL JVT CLICK/PCX/ADV 19G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 237, "product_name": "SLIDER PIECE JVT CLICK/PCX/ADV", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 238, "product_name": "FLYBALL CWORKS NMAX/AEROX/M3 12G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 239, "product_name": "FLYBALL CWORKS BEAT FI/GY6 13G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 240, "product_name": "FLYBALL CWORKS CLICK/PCX/ADV 13G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 241, "product_name": "SPARK PLUG CAP CWORKS NMAX V-TYPE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 242, "product_name": "SPARK PLUG CAP CWORKS PCX/ADV L-TYPE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 243, "product_name": "FALCON VIPER 6160 90/90-14 TL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 244, "product_name": "FALCON VIPER SPEED 90/80-14 TL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 245, "product_name": "FALCON VIPER EXTREME 110/80/14 TL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 246, "product_name": "FALCON VIPER EXTREME 90/80/14 TL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 247, "product_name": "FALCON VIPER EXTREME 100/80/14 TL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 248, "product_name": "CVT FI CLEANER PRO PROTECTOR 450ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 249, "product_name": "CORSA 110/70-13 M5", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 250, "product_name": "CORSA 130/70-13 M5", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 251, "product_name": "TIRE SEALANT BR", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 252, "product_name": "BRAKE FLUID SURE BRAKE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 253, "product_name": "COOLANT THAI 500ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 254, "product_name": "PETRON MONOGRADE 800ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 255, "product_name": "GEAR OIL PETRON", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 256, "product_name": "RS8 R9 1L", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 257, "product_name": "O-RING YAMAHA TORQUE DRIVE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 258, "product_name": "STEEL BOLT 10MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 259, "product_name": "CLUTCH LEVER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 260, "product_name": "CLUTCH LINING JVT GRAVIS/MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 261, "product_name": "NUT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 262, "product_name": "BOLT STAINLESS", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 263, "product_name": "NUT STAINLESS", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 264, "product_name": "NUT STAINLESS 14MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 265, "product_name": "HEADLIGHT LED 200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 266, "product_name": "STEEL NUT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 267, "product_name": "WELDING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 268, "product_name": "REGULATOR BARAKO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 269, "product_name": "USED OIL 1DRUM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 270, "product_name": "SYLVESTER SPRAY PAINT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 271, "product_name": "CLUTCH CABLE RAIDER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 273, "product_name": "STAINLESS SCREW FOR BRAKE MASTER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 274, "product_name": "CWORKS SPARK PLUG CUP", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 275, "product_name": "DUNLOP D115 70/90-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 276, "product_name": "PEANUT BULB SOCKET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 277, "product_name": "SLIDER PIECE JVT AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 278, "product_name": "HANDLE GRIP *", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 281, "product_name": "PETRON SCT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 282, "product_name": "O-RING CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 283, "product_name": "BEE RUBBER TIRE USED", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 284, "product_name": "INTERIOR", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 285, "product_name": "OIL SEAL 200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 286, "product_name": "ASPROCKET TMX 155", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 287, "product_name": "ENGINE SPROCKET TMX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 293, "product_name": "BATTERY CHARGING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 294, "product_name": "RELAY SOCKET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 295, "product_name": "DID CHAIN 428H", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 297, "product_name": "CDI 300", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 298, "product_name": "STEEL BOLT 12MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 299, "product_name": "CLUTCH SPRING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 300, "product_name": "CARBURETOR REPAIR KIT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 302, "product_name": "PETRON SC400", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 305, "product_name": "AREGULATOR LAM9", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 308, "product_name": "SIGNAL LIGHT LED T15 BLUE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 309, "product_name": "BRAKE CABLE 150", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 311, "product_name": "BRAKE CABLE BARAKO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 312, "product_name": "BALLRACE BEARING M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 313, "product_name": "BRAKE PAD ADV 160", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 314, "product_name": "BRAKE PAD MIO SPORTY", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 316, "product_name": "CLUTCH LINING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 317, "product_name": "ASUN RASING GEAR OIL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 318, "product_name": "SPARK PLUG CUP OEM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 292, "product_name": "ROTOR DISC", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.166666666666667, "stock_60d": 5.833333333333334, "stock_90d": 4.5, "product_id": 291, "product_name": "DIODE", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 6.166666666666666, "stock_90d": 4.5, "product_id": 290, "product_name": "INTERIOR 2.75", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 279, "product_name": "ACOOLANT", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 310, "product_name": "AINTERIOR KRX", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 8.166666666666668, "stock_90d": 7.5, "product_id": 304, "product_name": "AHEADLIGH SOCET", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 319, "product_name": "CARBON BRUSH 120", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 320, "product_name": "CORSA R26 80/80-14 1200", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 321, "product_name": "OIL SEAL YAMAHA PULLEY SIDE M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 325, "product_name": "CORSA CROSS S 130/70-13", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 326, "product_name": "ACARBURETOR CLEANER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 327, "product_name": "ARS8 ENGINE OIL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 328, "product_name": "BRAKE PAD 150", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 329, "product_name": "HONDA SCT GREY", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 330, "product_name": "SPROCKET SET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 331, "product_name": "O-RING TORQUE DRIVE 160", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 332, "product_name": "HONDA CARBON CLEANER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 333, "product_name": "BRAKE FLUID AEROMOTIVE DOT5", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 334, "product_name": "KOBY TIRE BLACK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 335, "product_name": "ADD OIL RACERX 200ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 336, "product_name": "TIRE SEALANT PROTIRE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 337, "product_name": "PULLEY SET JVT MIO/FINO/NOUVO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 338, "product_name": "PULLEY SET JVT MIOi125/m3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 339, "product_name": "CLUTCH LINING JVT BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 340, "product_name": "CLUTCH LINING JVT MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 341, "product_name": "FLYBALL JVT PCX 19G", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 342, "product_name": "SLIDER PIECE JVT NMAX/M3/AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 343, "product_name": "BELT CWORKS 2PH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 344, "product_name": "BRAKE SHOE CWORKS MIO SPORTY/SOULTY/M3/GEAR/GRAVIS/AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 345, "product_name": "BRAKE SHOE CWORKS CLICK125 V1 V2 V3 150/GC/160/AIRBLADE 150/BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 346, "product_name": "BRAKE PAD CWORKS NMAX REAR/MIO SPORTY/MXI/VEGA/FINO FRONT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 347, "product_name": "BRAKE PAD CWORKS NMAX FRONT/MIO 125/ MIO SOULi/M3/GRVIS/AEROX/SNIPER150/155", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 348, "product_name": "CLUTCH SPRING CWORKS ALL CLICK/PCX/ADV/MIO/M3/NMAX/AEROX/GY6/BEAT FI/XMAX/RUSI 800RPM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 349, "product_name": "SLIDER PIECE CWORKS CLICK125i/150/V1V2V3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 350, "product_name": "SLIDER PIECE CWORKS BEAT V1V2V3/GY6", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 351, "product_name": "SLIDER PIECE CWORKS NMAX/AEROX/MIO125/M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 352, "product_name": "BEARING KOYO 6002", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 353, "product_name": "BALLRACE BEARING OTAKA CLICK/BEAT/WAVE125/C100/WAVE100", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 354, "product_name": "IGNITION COIL LAZX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 355, "product_name": "BEARING KOYO 62/22", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 356, "product_name": "IGNITION COIL KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 357, "product_name": "BATTERY MOTOLITE MF4LB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 358, "product_name": "BATTERY MOTOLITE CHAMPION MTZ6V", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 359, "product_name": "COOLANT PETRON 500ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 360, "product_name": "TENSIONER YAMAHA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 361, "product_name": "SPEED CABLE WAVE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 362, "product_name": "QUICK TIRE 100/80-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 363, "product_name": "OIL SEAL BACKPLATE M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 364, "product_name": "HONDA BLUE SCT 800ML 285", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 365, "product_name": "FLASHER RELAY ADJUSTABLE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 366, "product_name": "FLASHER RELAY DZJ", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 367, "product_name": "NUT STAINLESS 12MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 368, "product_name": "QUICK TIRE 90/90-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 369, "product_name": "BRAKE PAD YAMAKOTO ADV/PCX REAR", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 370, "product_name": "THROTTLE CABLE MAKOTO SNIPER MXI VVA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 371, "product_name": "CLUTCH CABLE WOLF 125", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 372, "product_name": "CHAIN ADJUSTER KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 373, "product_name": "CARBON CLEANER HONDA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 374, "product_name": "BELT NMAX YAMAKOTO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 375, "product_name": "WIRE #18 OLD STOCK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 377, "product_name": "BOLT AND NUT 10MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 378, "product_name": "BELT HONDA CLICK 150", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 379, "product_name": "PETRON MONOGRADE / SC400 / SCT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 380, "product_name": "RS8 R9 1L / ARS8 ENGINE OIL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 381, "product_name": "AJVT / ASUN RACING GEAR OIL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 382, "product_name": "BRAKE FLUID SURE / AEROMOTIVE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 383, "product_name": "COOLANT THAI / PETRON 500ML", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 385, "product_name": "PEANUT BULB ORANGE / WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 386, "product_name": "TAIL / HEAD LIGHT BULB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 387, "product_name": "STARTER / ON-OFF / HORN SW", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 388, "product_name": "BRAKE SWITCH L / R", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 389, "product_name": "HAZARD / H/L / L/R SWITCH", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 390, "product_name": "HORN RELAY (4-PIN / 5-PIN)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 391, "product_name": "FUSE 10A / 15A / GLASS", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 392, "product_name": "HORN HELLA / BOSCH 190", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 393, "product_name": "STARTER RELAY MIO / XR / TMX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 394, "product_name": "REGULATOR RECTIFIER SKYDRIVE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 395, "product_name": "FUSE / FUSE BOX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 396, "product_name": "HEAD LIGHT LED T19 WHITE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 397, "product_name": "HEAD LIGHT LED MDL KILLER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 398, "product_name": "PARK LIGHT T15 (W/B/Y)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 399, "product_name": "PEANUT BULB T13 (W/O)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 400, "product_name": "AUTO WIRE #18 JAPAN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 401, "product_name": "BATTERY MOTOLITE MF4LB / MTZ6V", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 402, "product_name": "IGNITION COIL LAZX / KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 403, "product_name": "REGULATOR BARAKO / LAM9", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 404, "product_name": "HEADLIGHT LED 200 / T15 BLUE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 405, "product_name": "FLASHER RELAY ADJ / DZJ", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 406, "product_name": "TIRE SEALANT KOBY / KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 407, "product_name": "CORSA R26 80/80-14 / 90/80", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 408, "product_name": "FALCON VIPER 6160 90/90-14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 409, "product_name": "FALCON VIPER SPEED 90/80", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 410, "product_name": "FALCON VIPER EXTREME (VAR)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 411, "product_name": "CORSA 110/130 M5 & R26", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 412, "product_name": "QUICK TIRE 100/80 / 90/90", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 413, "product_name": "TIRE SEALANT BR / PROTIRE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 414, "product_name": "INTERIOR / KRX TUBE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 415, "product_name": "HONDA BELT CLICK 23100-K35", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 416, "product_name": "JVT FLYBALL 15G - PCX/CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 417, "product_name": "YAKIMOTO FLYBALL 10G - MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 418, "product_name": "BELT YAMAHA 5TL MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 419, "product_name": "BELT HONDA PCX/ADV 160", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 420, "product_name": "FLYBALL JVT (13G/19G)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 421, "product_name": "FLYBALL CWORKS (12G/13G)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 7.833333333333334, "stock_90d": 6.5, "product_id": 422, "product_name": "SLIDER PIECE HONDA / JVT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 423, "product_name": "CLUTCH SHOE JVT SET", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 424, "product_name": "AIR FILTER CLICK / AEROX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 426, "product_name": "RACING CARBURETOR KEIHIN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666666, "stock_60d": 5.833333333333333, "stock_90d": 3.5, "product_id": 427, "product_name": "FUEL PUMP ASSEMBLY BEAT FI", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.833333333333334, "stock_60d": 9.166666666666666, "stock_90d": 8.5, "product_id": 428, "product_name": "BELT CWORKS 2PH / NMAX / CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 322, "product_name": "ASLIDER PIECE SUN RACING", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.5, "stock_60d": 3.5, "stock_90d": 1.5, "product_id": 324, "product_name": "A6300", "current_stock": 7, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 429, "product_name": "CLUTCH LINING JVT (VARIOUS)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 430, "product_name": "FLYBALL JVT PCX 19G / MTRT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 431, "product_name": "SLIDER PIECE CWORKS / JVT / SUN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 432, "product_name": "CLUTCH SPRING CWORKS / GEN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 433, "product_name": "PULLEY SET JVT (VARIOUS)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 434, "product_name": "SPROCKET SET / ENGINE / TMX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 435, "product_name": "BRAKE PAD YAMAKOTO SHOGUN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 436, "product_name": "BRAKE PAD YAMAKOTO CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 437, "product_name": "YAMAHA GENUINE PADS 2DP", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 438, "product_name": "BRAKE PAD YAMAKOTO (VAR)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 439, "product_name": "BRAKE PAD HONDA (B6H/GEN)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 440, "product_name": "BRAKE PAD YAMAHA (MIO/AEROX)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 441, "product_name": "BRAKE SHOE HONDA CLICK GEN", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 442, "product_name": "BRAKE MASTER REPAIR KIT", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 444, "product_name": "OIL SEAL (PULLEY/AXLE)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.833333333333334, "stock_60d": 7.166666666666666, "stock_90d": 5.5, "product_id": 445, "product_name": "THROTTLE / CLUTCH / BRAKE CAB", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.5, "stock_60d": 8.5, "stock_90d": 7.5, "product_id": 446, "product_name": "BRAKE PAD CWORKS (VARIOUS)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 447, "product_name": "BRAKE PAD YAMAKOTO ADV / PCX", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 448, "product_name": "BRAKE PAD CLICK / ADV / MIO", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.5, "stock_60d": 6.5, "stock_90d": 4.5, "product_id": 449, "product_name": "BRAKE SHOE CWORKS / OTAKA", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 450, "product_name": "CLUTCH CABLE RAIDER / WOLF", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 451, "product_name": "THROTTLE / SPEED / BRAKE CABLE", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 452, "product_name": "BALLRACE NMAX / M3 / SUNTAL", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 453, "product_name": "BEARING KOYO 6002 / 62/22 / 6303", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 454, "product_name": "FUEL HOSE RED / BLACK (FT)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.166666666666666, "stock_60d": 9.833333333333334, "stock_90d": 9.5, "product_id": 455, "product_name": "WASHER 10 / 12 / 14", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 456, "product_name": "FLARINGS SCREW / PASAK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 457, "product_name": "STAINLESS SCREW W/ WASHER", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 458, "product_name": "BOLT MUSHROOM (S/T/G)", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 459, "product_name": "RUBBER DUMPER WAVE/KHC", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 460, "product_name": "O-RING / FUEL PUMP O-RING", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 461, "product_name": "NUT / BOLT / WASHER STAINLESS", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 462, "product_name": "STEEL BOLT 10MM / 12MM", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 463, "product_name": "O-RING TORQUE DRIVE / CLICK", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 10.5, "stock_60d": 10.5, "stock_90d": 10.5, "product_id": 464, "product_name": "OIL SEAL BACKPLATE / PULLEY M3", "current_stock": 10, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 443, "product_name": "BALLRACE / BEARING (VAR)", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 323, "product_name": "ABRAKE SWITCH UNIVERSAL", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 6.5, "stock_60d": 4.5, "stock_90d": 2.5, "product_id": 301, "product_name": "ABRAKE SWITCH FOOT BRAKE", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666668, "stock_60d": 6.833333333333334, "stock_90d": 5.5, "product_id": 153, "product_name": "AIR FILTER AEROX V1", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 7.833333333333333, "stock_60d": 7.166666666666667, "stock_90d": 6.5, "product_id": 425, "product_name": "AIR FILTER PCX / KLX / NMAX", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666668, "stock_60d": 6.833333333333334, "stock_90d": 5.5, "product_id": 280, "product_name": "AJVT GEAR OIL", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 306, "product_name": "AKRX TUBE", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 5.166666666666666, "stock_60d": 1.833333333333333, "stock_90d": 0.0, "product_id": 296, "product_name": "ASPARK PLUG HELLA", "current_stock": 8, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 9.166666666666666, "stock_60d": 8.833333333333334, "stock_90d": 8.5, "product_id": 288, "product_name": "AXLE EHE TMX", "current_stock": 9, "recommended_order": 0}, {"urgency": "Low", "stock_30d": 8.166666666666668, "stock_60d": 6.833333333333334, "stock_90d": 5.5, "product_id": 189, "product_name": "AUTO WIRE #18 JAPAN PER METER", "current_stock": 9, "recommended_order": 0}, {"urgency": "Medium", "stock_30d": 1.1666666666666665, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 272, "product_name": "BALLRACE NMAX SUNTAL", "current_stock": 4, "recommended_order": 0}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 152, "product_name": "AIR FILTER CLICK125", "current_stock": 0, "recommended_order": 8}, {"urgency": "High", "stock_30d": 0.0, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 384, "product_name": "ADD OIL PETRON / RACERX 200M", "current_stock": 0, "recommended_order": 8}, {"urgency": "Low", "stock_30d": 1.5, "stock_60d": 0.0, "stock_90d": 0.0, "product_id": 289, "product_name": "ADD OIL PETRON", "current_stock": 3, "recommended_order": 0}]}, "generated_at": "2026-04-07T04:03:19.046413+00:00"}	rolling_average	ready	Cache refreshed (Prophet when available; else rolling mean).	2026-04-07 12:03:17.453408	2026-04-07 12:03:17.453408	1629	2026-04-07 13:03:19.046423
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
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (inventory_id, product_id, reorder_level, last_updated, quantity, expected, actual, reason_adjustment) FROM stdin;
1	1	5	2026-04-06	5	5	5	Initial stock
2	2	5	2026-04-06	10	10	10	Initial stock
3	3	5	2026-04-06	10	10	10	Initial stock
4	4	5	2026-04-06	10	10	10	Initial stock
5	5	5	2026-04-06	10	10	10	Initial stock
7	7	5	2026-04-06	10	10	10	Initial stock
8	8	5	2026-04-06	10	10	10	Initial stock
9	9	5	2026-04-06	10	10	10	Initial stock
10	10	5	2026-04-06	10	10	10	Initial stock
11	11	5	2026-04-06	0	0	0	Initial stock
12	12	5	2026-04-06	10	10	10	Initial stock
14	14	5	2026-04-06	0	0	0	Initial stock
16	16	5	2026-04-06	0	0	0	Initial stock
21	21	5	2026-04-06	10	10	10	Initial stock
22	22	5	2026-04-06	10	10	10	Initial stock
23	23	5	2026-04-06	10	10	10	Initial stock
24	24	5	2026-04-06	10	10	10	Initial stock
25	25	5	2026-04-06	10	10	10	Initial stock
28	28	5	2026-04-06	0	0	0	Initial import from excel file
29	29	5	2026-04-06	0	0	0	Initial import from excel file
18	18	5	2026-04-06	8	8	8	Initial stock
19	19	5	2026-04-06	8	8	8	Initial stock
20	20	5	2026-04-06	9	9	9	Initial stock
15	15	5	2026-04-06	9	9	9	Initial stock
13	13	5	2026-04-06	9	9	9	Initial stock
17	17	5	2026-04-06	9	9	9	Initial stock
6	6	5	2026-04-06	8	8	8	Initial stock
27	27	5	2026-04-06	8	8	8	Initial stock
26	26	5	2026-04-06	8	8	8	Initial stock
303	303	5	2026-04-06	9	9	9	Initial import
227	227	5	2026-04-06	9	9	9	Initial import
376	376	5	2026-04-06	9	9	9	Initial import
30	30	5	2026-04-06	10	10	10	Initial import
31	31	5	2026-04-06	10	10	10	Initial import
32	32	5	2026-04-06	10	10	10	Initial import
33	33	5	2026-04-06	10	10	10	Initial import
34	34	5	2026-04-06	10	10	10	Initial import
35	35	5	2026-04-06	10	10	10	Initial import
36	36	5	2026-04-06	10	10	10	Initial import
37	37	5	2026-04-06	10	10	10	Initial import
38	38	5	2026-04-06	10	10	10	Initial import
39	39	5	2026-04-06	10	10	10	Initial import
40	40	5	2026-04-06	10	10	10	Initial import
41	41	5	2026-04-06	10	10	10	Initial import
42	42	5	2026-04-06	10	10	10	Initial import
43	43	5	2026-04-06	10	10	10	Initial import
44	44	5	2026-04-06	10	10	10	Initial import
45	45	5	2026-04-06	10	10	10	Initial import
46	46	5	2026-04-06	10	10	10	Initial import
47	47	5	2026-04-06	10	10	10	Initial import
48	48	5	2026-04-06	10	10	10	Initial import
49	49	5	2026-04-06	10	10	10	Initial import
50	50	5	2026-04-06	10	10	10	Initial import
51	51	5	2026-04-06	10	10	10	Initial import
52	52	5	2026-04-06	10	10	10	Initial import
53	53	5	2026-04-06	10	10	10	Initial import
54	54	5	2026-04-06	10	10	10	Initial import
55	55	5	2026-04-06	10	10	10	Initial import
56	56	5	2026-04-06	10	10	10	Initial import
57	57	5	2026-04-06	10	10	10	Initial import
58	58	5	2026-04-06	10	10	10	Initial import
59	59	5	2026-04-06	10	10	10	Initial import
60	60	5	2026-04-06	10	10	10	Initial import
61	61	5	2026-04-06	10	10	10	Initial import
62	62	5	2026-04-06	10	10	10	Initial import
63	63	5	2026-04-06	10	10	10	Initial import
64	64	5	2026-04-06	10	10	10	Initial import
65	65	5	2026-04-06	10	10	10	Initial import
66	66	5	2026-04-06	10	10	10	Initial import
67	67	5	2026-04-06	10	10	10	Initial import
68	68	5	2026-04-06	10	10	10	Initial import
69	69	5	2026-04-06	10	10	10	Initial import
70	70	5	2026-04-06	10	10	10	Initial import
71	71	5	2026-04-06	10	10	10	Initial import
72	72	5	2026-04-06	10	10	10	Initial import
73	73	5	2026-04-06	10	10	10	Initial import
74	74	5	2026-04-06	10	10	10	Initial import
75	75	5	2026-04-06	10	10	10	Initial import
76	76	5	2026-04-06	10	10	10	Initial import
77	77	5	2026-04-06	10	10	10	Initial import
78	78	5	2026-04-06	10	10	10	Initial import
79	79	5	2026-04-06	10	10	10	Initial import
80	80	5	2026-04-06	10	10	10	Initial import
81	81	5	2026-04-06	10	10	10	Initial import
82	82	5	2026-04-06	10	10	10	Initial import
83	83	5	2026-04-06	10	10	10	Initial import
84	84	5	2026-04-06	10	10	10	Initial import
85	85	5	2026-04-06	10	10	10	Initial import
86	86	5	2026-04-06	10	10	10	Initial import
87	87	5	2026-04-06	10	10	10	Initial import
88	88	5	2026-04-06	10	10	10	Initial import
89	89	5	2026-04-06	10	10	10	Initial import
90	90	5	2026-04-06	10	10	10	Initial import
91	91	5	2026-04-06	10	10	10	Initial import
92	92	5	2026-04-06	10	10	10	Initial import
93	93	5	2026-04-06	10	10	10	Initial import
94	94	5	2026-04-06	10	10	10	Initial import
95	95	5	2026-04-06	10	10	10	Initial import
96	96	5	2026-04-06	10	10	10	Initial import
97	97	5	2026-04-06	10	10	10	Initial import
98	98	5	2026-04-06	10	10	10	Initial import
315	315	5	2026-04-07	7	7	7	Initial import
307	307	5	2026-04-07	8	8	8	Return rejected: #4
99	99	5	2026-04-06	10	10	10	Initial import
100	100	5	2026-04-06	10	10	10	Initial import
101	101	5	2026-04-06	10	10	10	Initial import
102	102	5	2026-04-06	10	10	10	Initial import
103	103	5	2026-04-06	10	10	10	Initial import
104	104	5	2026-04-06	10	10	10	Initial import
105	105	5	2026-04-06	10	10	10	Initial import
106	106	5	2026-04-06	10	10	10	Initial import
107	107	5	2026-04-06	10	10	10	Initial import
108	108	5	2026-04-06	10	10	10	Initial import
109	109	5	2026-04-06	10	10	10	Initial import
110	110	5	2026-04-06	10	10	10	Initial import
111	111	5	2026-04-06	10	10	10	Initial import
112	112	5	2026-04-06	10	10	10	Initial import
113	113	5	2026-04-06	10	10	10	Initial import
114	114	5	2026-04-06	10	10	10	Initial import
115	115	5	2026-04-06	10	10	10	Initial import
116	116	5	2026-04-06	10	10	10	Initial import
117	117	5	2026-04-06	10	10	10	Initial import
118	118	5	2026-04-06	10	10	10	Initial import
119	119	5	2026-04-06	10	10	10	Initial import
120	120	5	2026-04-06	10	10	10	Initial import
121	121	5	2026-04-06	10	10	10	Initial import
122	122	5	2026-04-06	10	10	10	Initial import
123	123	5	2026-04-06	10	10	10	Initial import
124	124	5	2026-04-06	10	10	10	Initial import
125	125	5	2026-04-06	10	10	10	Initial import
127	127	5	2026-04-06	10	10	10	Initial import
128	128	5	2026-04-06	10	10	10	Initial import
129	129	5	2026-04-06	10	10	10	Initial import
130	130	5	2026-04-06	10	10	10	Initial import
131	131	5	2026-04-06	10	10	10	Initial import
132	132	5	2026-04-06	10	10	10	Initial import
133	133	5	2026-04-06	10	10	10	Initial import
134	134	5	2026-04-06	10	10	10	Initial import
135	135	5	2026-04-06	10	10	10	Initial import
136	136	5	2026-04-06	10	10	10	Initial import
137	137	5	2026-04-06	10	10	10	Initial import
138	138	5	2026-04-06	10	10	10	Initial import
139	139	5	2026-04-06	10	10	10	Initial import
140	140	5	2026-04-06	10	10	10	Initial import
141	141	5	2026-04-06	10	10	10	Initial import
142	142	5	2026-04-06	10	10	10	Initial import
143	143	5	2026-04-06	10	10	10	Initial import
144	144	5	2026-04-06	10	10	10	Initial import
145	145	5	2026-04-06	10	10	10	Initial import
146	146	5	2026-04-06	10	10	10	Initial import
147	147	5	2026-04-06	10	10	10	Initial import
148	148	5	2026-04-06	10	10	10	Initial import
149	149	5	2026-04-06	10	10	10	Initial import
150	150	5	2026-04-06	10	10	10	Initial import
151	151	5	2026-04-06	10	10	10	Initial import
154	154	5	2026-04-06	10	10	10	Initial import
155	155	5	2026-04-06	10	10	10	Initial import
156	156	5	2026-04-06	10	10	10	Initial import
157	157	5	2026-04-06	10	10	10	Initial import
158	158	5	2026-04-06	10	10	10	Initial import
159	159	5	2026-04-06	10	10	10	Initial import
160	160	5	2026-04-06	10	10	10	Initial import
161	161	5	2026-04-06	10	10	10	Initial import
162	162	5	2026-04-06	10	10	10	Initial import
163	163	5	2026-04-06	10	10	10	Initial import
164	164	5	2026-04-06	10	10	10	Initial import
165	165	5	2026-04-06	10	10	10	Initial import
166	166	5	2026-04-06	10	10	10	Initial import
167	167	5	2026-04-06	10	10	10	Initial import
168	168	5	2026-04-06	10	10	10	Initial import
169	169	5	2026-04-06	10	10	10	Initial import
170	170	5	2026-04-06	10	10	10	Initial import
171	171	5	2026-04-06	10	10	10	Initial import
172	172	5	2026-04-06	10	10	10	Initial import
173	173	5	2026-04-06	10	10	10	Initial import
174	174	5	2026-04-06	10	10	10	Initial import
175	175	5	2026-04-06	10	10	10	Initial import
176	176	5	2026-04-06	10	10	10	Initial import
177	177	5	2026-04-06	10	10	10	Initial import
178	178	5	2026-04-06	10	10	10	Initial import
179	179	5	2026-04-06	10	10	10	Initial import
180	180	5	2026-04-06	10	10	10	Initial import
181	181	5	2026-04-06	10	10	10	Initial import
182	182	5	2026-04-06	10	10	10	Initial import
183	183	5	2026-04-06	10	10	10	Initial import
184	184	5	2026-04-06	10	10	10	Initial import
185	185	5	2026-04-06	10	10	10	Initial import
186	186	5	2026-04-06	10	10	10	Initial import
187	187	5	2026-04-06	10	10	10	Initial import
188	188	5	2026-04-06	10	10	10	Initial import
190	190	5	2026-04-06	10	10	10	Initial import
191	191	5	2026-04-06	10	10	10	Initial import
192	192	5	2026-04-06	10	10	10	Initial import
193	193	5	2026-04-06	10	10	10	Initial import
194	194	5	2026-04-06	10	10	10	Initial import
195	195	5	2026-04-06	10	10	10	Initial import
196	196	5	2026-04-06	10	10	10	Initial import
197	197	5	2026-04-06	10	10	10	Initial import
198	198	5	2026-04-06	10	10	10	Initial import
199	199	5	2026-04-06	10	10	10	Initial import
200	200	5	2026-04-06	10	10	10	Initial import
201	201	5	2026-04-06	10	10	10	Initial import
202	202	5	2026-04-06	10	10	10	Initial import
203	203	5	2026-04-06	10	10	10	Initial import
204	204	5	2026-04-06	10	10	10	Initial import
205	205	5	2026-04-06	10	10	10	Initial import
126	126	5	2026-04-07	7	7	7	Return removed: #7
206	206	5	2026-04-06	10	10	10	Initial import
207	207	5	2026-04-06	10	10	10	Initial import
208	208	5	2026-04-06	10	10	10	Initial import
209	209	5	2026-04-06	10	10	10	Initial import
210	210	5	2026-04-06	10	10	10	Initial import
211	211	5	2026-04-06	10	10	10	Initial import
212	212	5	2026-04-06	10	10	10	Initial import
213	213	5	2026-04-06	10	10	10	Initial import
214	214	5	2026-04-06	10	10	10	Initial import
215	215	5	2026-04-06	10	10	10	Initial import
216	216	5	2026-04-06	10	10	10	Initial import
217	217	5	2026-04-06	10	10	10	Initial import
218	218	5	2026-04-06	10	10	10	Initial import
219	219	5	2026-04-06	10	10	10	Initial import
220	220	5	2026-04-06	10	10	10	Initial import
221	221	5	2026-04-06	10	10	10	Initial import
222	222	5	2026-04-06	10	10	10	Initial import
223	223	5	2026-04-06	10	10	10	Initial import
224	224	5	2026-04-06	10	10	10	Initial import
225	225	5	2026-04-06	10	10	10	Initial import
226	226	5	2026-04-06	10	10	10	Initial import
228	228	5	2026-04-06	10	10	10	Initial import
229	229	5	2026-04-06	10	10	10	Initial import
230	230	5	2026-04-06	10	10	10	Initial import
231	231	5	2026-04-06	10	10	10	Initial import
232	232	5	2026-04-06	10	10	10	Initial import
233	233	5	2026-04-06	10	10	10	Initial import
234	234	5	2026-04-06	10	10	10	Initial import
235	235	5	2026-04-06	10	10	10	Initial import
236	236	5	2026-04-06	10	10	10	Initial import
237	237	5	2026-04-06	10	10	10	Initial import
238	238	5	2026-04-06	10	10	10	Initial import
239	239	5	2026-04-06	10	10	10	Initial import
240	240	5	2026-04-06	10	10	10	Initial import
241	241	5	2026-04-06	10	10	10	Initial import
242	242	5	2026-04-06	10	10	10	Initial import
243	243	5	2026-04-06	10	10	10	Initial import
244	244	5	2026-04-06	10	10	10	Initial import
245	245	5	2026-04-06	10	10	10	Initial import
246	246	5	2026-04-06	10	10	10	Initial import
247	247	5	2026-04-06	10	10	10	Initial import
248	248	5	2026-04-06	10	10	10	Initial import
249	249	5	2026-04-06	10	10	10	Initial import
250	250	5	2026-04-06	10	10	10	Initial import
251	251	5	2026-04-06	10	10	10	Initial import
252	252	5	2026-04-06	10	10	10	Initial import
253	253	5	2026-04-06	10	10	10	Initial import
254	254	5	2026-04-06	10	10	10	Initial import
255	255	5	2026-04-06	10	10	10	Initial import
256	256	5	2026-04-06	10	10	10	Initial import
257	257	5	2026-04-06	10	10	10	Initial import
258	258	5	2026-04-06	10	10	10	Initial import
259	259	5	2026-04-06	10	10	10	Initial import
260	260	5	2026-04-06	10	10	10	Initial import
261	261	5	2026-04-06	10	10	10	Initial import
262	262	5	2026-04-06	10	10	10	Initial import
263	263	5	2026-04-06	10	10	10	Initial import
264	264	5	2026-04-06	10	10	10	Initial import
265	265	5	2026-04-06	10	10	10	Initial import
266	266	5	2026-04-06	10	10	10	Initial import
267	267	5	2026-04-06	10	10	10	Initial import
268	268	5	2026-04-06	10	10	10	Initial import
269	269	5	2026-04-06	10	10	10	Initial import
270	270	5	2026-04-06	10	10	10	Initial import
271	271	5	2026-04-06	10	10	10	Initial import
273	273	5	2026-04-06	10	10	10	Initial import
274	274	5	2026-04-06	10	10	10	Initial import
275	275	5	2026-04-06	10	10	10	Initial import
276	276	5	2026-04-06	10	10	10	Initial import
277	277	5	2026-04-06	10	10	10	Initial import
278	278	5	2026-04-06	10	10	10	Initial import
281	281	5	2026-04-06	10	10	10	Initial import
282	282	5	2026-04-06	10	10	10	Initial import
283	283	5	2026-04-06	10	10	10	Initial import
284	284	5	2026-04-06	10	10	10	Initial import
285	285	5	2026-04-06	10	10	10	Initial import
286	286	5	2026-04-06	10	10	10	Initial import
287	287	5	2026-04-06	10	10	10	Initial import
293	293	5	2026-04-06	10	10	10	Initial import
294	294	5	2026-04-06	10	10	10	Initial import
295	295	5	2026-04-06	10	10	10	Initial import
297	297	5	2026-04-06	10	10	10	Initial import
298	298	5	2026-04-06	10	10	10	Initial import
299	299	5	2026-04-06	10	10	10	Initial import
300	300	5	2026-04-06	10	10	10	Initial import
302	302	5	2026-04-06	10	10	10	Initial import
305	305	5	2026-04-06	10	10	10	Initial import
308	308	5	2026-04-06	10	10	10	Initial import
309	309	5	2026-04-06	10	10	10	Initial import
311	311	5	2026-04-06	10	10	10	Initial import
312	312	5	2026-04-06	10	10	10	Initial import
313	313	5	2026-04-06	10	10	10	Initial import
314	314	5	2026-04-06	10	10	10	Initial import
316	316	5	2026-04-06	10	10	10	Initial import
317	317	5	2026-04-06	10	10	10	Initial import
318	318	5	2026-04-06	10	10	10	Initial import
292	292	5	2026-04-07	9	9	9	Initial import
291	291	5	2026-04-06	8	8	8	Initial import
290	290	5	2026-04-06	9	9	9	Initial import
279	279	5	2026-04-07	9	9	9	Initial import
310	310	5	2026-04-07	8	8	8	Initial import
304	304	5	2026-04-07	9	9	9	Initial import
319	319	5	2026-04-06	10	10	10	Initial import
320	320	5	2026-04-06	10	10	10	Initial import
321	321	5	2026-04-06	10	10	10	Initial import
325	325	5	2026-04-06	10	10	10	Initial import
326	326	5	2026-04-06	10	10	10	Initial import
327	327	5	2026-04-06	10	10	10	Initial import
328	328	5	2026-04-06	10	10	10	Initial import
329	329	5	2026-04-06	10	10	10	Initial import
330	330	5	2026-04-06	10	10	10	Initial import
331	331	5	2026-04-06	10	10	10	Initial import
332	332	5	2026-04-06	10	10	10	Initial import
333	333	5	2026-04-06	10	10	10	Initial import
334	334	5	2026-04-06	10	10	10	Initial import
335	335	5	2026-04-06	10	10	10	Initial import
336	336	5	2026-04-06	10	10	10	Initial import
337	337	5	2026-04-06	10	10	10	Initial import
338	338	5	2026-04-06	10	10	10	Initial import
339	339	5	2026-04-06	10	10	10	Initial import
340	340	5	2026-04-06	10	10	10	Initial import
341	341	5	2026-04-06	10	10	10	Initial import
342	342	5	2026-04-06	10	10	10	Initial import
343	343	5	2026-04-06	10	10	10	Initial import
344	344	5	2026-04-06	10	10	10	Initial import
345	345	5	2026-04-06	10	10	10	Initial import
346	346	5	2026-04-06	10	10	10	Initial import
347	347	5	2026-04-06	10	10	10	Initial import
348	348	5	2026-04-06	10	10	10	Initial import
349	349	5	2026-04-06	10	10	10	Initial import
350	350	5	2026-04-06	10	10	10	Initial import
351	351	5	2026-04-06	10	10	10	Initial import
352	352	5	2026-04-06	10	10	10	Initial import
353	353	5	2026-04-06	10	10	10	Initial import
354	354	5	2026-04-06	10	10	10	Initial import
355	355	5	2026-04-06	10	10	10	Initial import
356	356	5	2026-04-06	10	10	10	Initial import
357	357	5	2026-04-06	10	10	10	Initial import
358	358	5	2026-04-06	10	10	10	Initial import
359	359	5	2026-04-06	10	10	10	Initial import
360	360	5	2026-04-06	10	10	10	Initial import
361	361	5	2026-04-06	10	10	10	Initial import
362	362	5	2026-04-06	10	10	10	Initial import
363	363	5	2026-04-06	10	10	10	Initial import
364	364	5	2026-04-06	10	10	10	Initial import
365	365	5	2026-04-06	10	10	10	Initial import
366	366	5	2026-04-06	10	10	10	Initial import
367	367	5	2026-04-06	10	10	10	Initial import
368	368	5	2026-04-06	10	10	10	Initial import
369	369	5	2026-04-06	10	10	10	Initial import
370	370	5	2026-04-06	10	10	10	Initial import
371	371	5	2026-04-06	10	10	10	Initial import
372	372	5	2026-04-06	10	10	10	Initial import
373	373	5	2026-04-06	10	10	10	Initial import
374	374	5	2026-04-06	10	10	10	Initial import
375	375	5	2026-04-06	10	10	10	Initial import
377	377	5	2026-04-06	10	10	10	Initial import
378	378	5	2026-04-06	10	10	10	Initial import
379	379	5	2026-04-06	10	10	10	Initial import
380	380	5	2026-04-06	10	10	10	Initial import
381	381	5	2026-04-06	10	10	10	Initial import
382	382	5	2026-04-06	10	10	10	Initial import
383	383	5	2026-04-06	10	10	10	Initial import
385	385	5	2026-04-06	10	10	10	Initial import
386	386	5	2026-04-06	10	10	10	Initial import
387	387	5	2026-04-06	10	10	10	Initial import
388	388	5	2026-04-06	10	10	10	Initial import
389	389	5	2026-04-06	10	10	10	Initial import
390	390	5	2026-04-06	10	10	10	Initial import
391	391	5	2026-04-06	10	10	10	Initial import
392	392	5	2026-04-06	10	10	10	Initial import
393	393	5	2026-04-06	10	10	10	Initial import
394	394	5	2026-04-06	10	10	10	Initial import
395	395	5	2026-04-06	10	10	10	Initial import
396	396	5	2026-04-06	10	10	10	Initial import
397	397	5	2026-04-06	10	10	10	Initial import
398	398	5	2026-04-06	10	10	10	Initial import
399	399	5	2026-04-06	10	10	10	Initial import
400	400	5	2026-04-06	10	10	10	Initial import
401	401	5	2026-04-06	10	10	10	Initial import
402	402	5	2026-04-06	10	10	10	Initial import
403	403	5	2026-04-06	10	10	10	Initial import
404	404	5	2026-04-06	10	10	10	Initial import
405	405	5	2026-04-06	10	10	10	Initial import
406	406	5	2026-04-06	10	10	10	Initial import
407	407	5	2026-04-06	10	10	10	Initial import
408	408	5	2026-04-06	10	10	10	Initial import
409	409	5	2026-04-06	10	10	10	Initial import
410	410	5	2026-04-06	10	10	10	Initial import
411	411	5	2026-04-06	10	10	10	Initial import
412	412	5	2026-04-06	10	10	10	Initial import
413	413	5	2026-04-06	10	10	10	Initial import
414	414	5	2026-04-06	10	10	10	Initial import
415	415	5	2026-04-06	10	10	10	Initial import
416	416	5	2026-04-06	10	10	10	Initial import
417	417	5	2026-04-06	10	10	10	Initial import
418	418	5	2026-04-06	10	10	10	Initial import
419	419	5	2026-04-06	10	10	10	Initial import
420	420	5	2026-04-06	10	10	10	Initial import
421	421	5	2026-04-06	10	10	10	Initial import
422	422	5	2026-04-06	10	10	10	Initial import
423	423	5	2026-04-06	10	10	10	Initial import
424	424	5	2026-04-06	10	10	10	Initial import
426	426	5	2026-04-06	10	10	10	Initial import
427	427	5	2026-04-06	10	10	10	Initial import
428	428	5	2026-04-06	10	10	10	Initial import
322	322	5	2026-04-06	9	9	9	Initial import
324	324	5	2026-04-07	7	7	7	Return removed: #8
429	429	5	2026-04-06	10	10	10	Initial import
430	430	5	2026-04-06	10	10	10	Initial import
431	431	5	2026-04-06	10	10	10	Initial import
432	432	5	2026-04-06	10	10	10	Initial import
433	433	5	2026-04-06	10	10	10	Initial import
434	434	5	2026-04-06	10	10	10	Initial import
435	435	5	2026-04-06	10	10	10	Initial import
436	436	5	2026-04-06	10	10	10	Initial import
437	437	5	2026-04-06	10	10	10	Initial import
438	438	5	2026-04-06	10	10	10	Initial import
439	439	5	2026-04-06	10	10	10	Initial import
440	440	5	2026-04-06	10	10	10	Initial import
441	441	5	2026-04-06	10	10	10	Initial import
442	442	5	2026-04-06	10	10	10	Initial import
444	444	5	2026-04-06	10	10	10	Initial import
445	445	5	2026-04-06	10	10	10	Initial import
446	446	5	2026-04-06	10	10	10	Initial import
447	447	5	2026-04-06	10	10	10	Initial import
448	448	5	2026-04-06	10	10	10	Initial import
449	449	5	2026-04-06	10	10	10	Initial import
450	450	5	2026-04-06	10	10	10	Initial import
451	451	5	2026-04-06	10	10	10	Initial import
452	452	5	2026-04-06	10	10	10	Initial import
453	453	5	2026-04-06	10	10	10	Initial import
454	454	5	2026-04-06	10	10	10	Initial import
455	455	5	2026-04-06	10	10	10	Initial import
456	456	5	2026-04-06	10	10	10	Initial import
457	457	5	2026-04-06	10	10	10	Initial import
458	458	5	2026-04-06	10	10	10	Initial import
459	459	5	2026-04-06	10	10	10	Initial import
460	460	5	2026-04-06	10	10	10	Initial import
461	461	5	2026-04-06	10	10	10	Initial import
462	462	5	2026-04-06	10	10	10	Initial import
463	463	5	2026-04-06	10	10	10	Initial import
464	464	5	2026-04-06	10	10	10	Initial import
443	443	5	2026-04-06	9	9	9	Initial import
323	323	5	2026-04-06	8	8	8	Initial import
301	301	5	2026-04-06	8	8	8	Initial import
153	153	5	2026-04-06	9	9	9	Initial import
425	425	5	2026-04-06	8	8	8	Initial import
280	280	5	2026-04-06	9	9	9	Initial import
306	306	5	2026-04-06	9	9	9	Initial import
296	296	5	2026-04-06	8	8	8	Initial import
288	288	5	2026-04-06	9	9	9	Initial import
189	189	5	2026-04-06	9	9	9	Initial import
272	272	5	2026-04-06	4	4	4	Initial import
152	152	5	2026-04-06	0	0	0	Initial import
384	384	5	2026-04-06	0	0	0	Initial import
289	289	5	2026-04-07	3	3	3	Return removed: #3
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
\.


--
-- Data for Name: lowstockalerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lowstockalerts (alert_id, product_id, inventory_id, threshold, quantity, status, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id) FROM stdin;
25	275	Cash	2000.00	2026-04-06 01:37:05.987978	\N
26	276	GCash	2128.86	2026-04-06 01:59:53.392284	src_DLAbgQkKQaA1WfYouX9Qzctc
27	277	Cash	1000.00	2026-04-06 16:48:06.33634	\N
28	278	Cash	1000.00	2026-04-06 17:11:26.240932	\N
29	279	Cash	6000.00	2026-04-06 17:12:42.598317	\N
30	280	Cash	4000.00	2026-04-06 17:13:49.255234	\N
31	281	Cash	300.00	2026-04-06 23:25:56.132229	\N
32	282	Cash	60.00	2026-04-06 23:44:21.556899	\N
33	283	Cash	120.00	2026-04-07 00:07:26.10574	\N
34	284	Cash	610.00	2026-04-07 00:08:47.121571	\N
35	399	Cash	200.00	2026-04-07 00:57:05.162453	\N
36	400	Cash	600.00	2026-04-07 11:57:33.962459	\N
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
324	4	\N	A6300	25.00	O-A6	2026-04-06	Piece	Others	110.00	Active	\N
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
5	Warehouse Staff	\N	{"Inventory": ["View", "Add Item", "Edit"], "Products": ["View"], "Suppliers": ["View"], "Purchase Order": ["View"], "Product Return": ["View", "Process Return"]}
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (invoice_id, pos_terminal_id, user_id, invoice_date, total_amount, tax_amount, customer_info, payment_method, payment_status, service_charge, transaction_timestamp, return_id, cash_received, cash_given, change_amount, contact_number, address, failure_reason) FROM stdin;
283	1	2	2026-04-07	103.00	3.00	Walk-in Customer	Cash	Paid	0.00	2026-04-07 00:07:26.10574	\N	120.00	120.00	17.00	\N	\N	\N
284	1	2	2026-04-07	607.70	17.70	Walk-in Customer	Cash	Paid	0.00	2026-04-07 00:08:47.121571	\N	610.00	610.00	2.30	\N	\N	\N
399	1	2	2026-04-07	154.50	4.50	Robek	Cash	Paid	0.00	2026-04-07 00:57:05.162453	\N	200.00	200.00	45.50	\N	\N	\N
400	1	2	2026-04-07	530.45	15.45	Walk-in Customer	Cash	Paid	0.00	2026-04-07 11:57:33.962459	\N	600.00	600.00	69.55	\N	\N	\N
275	1	\N	2026-04-06	1833.40	53.40	Rovhic	Cash	Paid	0.00	2026-04-06 01:37:05.987978	\N	2000.00	2000.00	166.60	\N	\N	\N
276	1	\N	2026-04-06	2128.86	62.01	Walk-in Customer	GCash	Paid	0.00	2026-04-06 01:59:53.392284	\N	2128.86	2128.86	0.00	\N	\N	\N
277	1	\N	2026-04-06	497.84	14.50	Walk-in Customer	Cash	Paid	0.00	2026-04-06 16:48:06.33634	\N	1000.00	1000.00	502.16	\N	\N	\N
278	1	\N	2026-04-06	611.14	17.80	Walk-in Customer	Cash	Paid	0.00	2026-04-06 17:11:26.240932	\N	1000.00	1000.00	388.86	\N	\N	\N
279	1	\N	2026-04-06	5624.24	163.81	Walk-in Customer	Cash	Paid	0.00	2026-04-06 17:12:42.598317	\N	6000.00	6000.00	375.76	\N	\N	\N
280	1	\N	2026-04-06	3570.72	104.00	Walk-in Customer	Cash	Paid	0.00	2026-04-06 17:13:49.255234	\N	4000.00	4000.00	429.28	\N	\N	\N
281	1	\N	2026-04-06	257.50	7.50	Walk-in Customer	Cash	Paid	0.00	2026-04-06 23:25:56.132229	\N	300.00	300.00	42.50	\N	\N	\N
282	1	\N	2026-04-06	51.50	1.50	John Rovhic	Cash	Paid	0.00	2026-04-06 23:44:21.556899	\N	60.00	60.00	8.50	\N	\N	\N
285	1	\N	2026-02-26	356.71	10.39	Walk-in	Cash	Paid	0.00	2026-02-26 00:00:00	\N	456.71	456.71	100.00	\N	\N	\N
286	1	\N	2026-02-26	31.36	0.91	Walk-in	Cash	Paid	0.00	2026-02-26 00:00:00	\N	131.36	131.36	100.00	\N	\N	\N
287	1	\N	2026-02-26	1336.69	38.93	Walk-in	Cash	Paid	0.00	2026-02-26 00:00:00	\N	1436.69	1436.69	100.00	\N	\N	\N
288	1	\N	2026-02-26	195.75	5.70	Walk-in	Cash	Paid	0.00	2026-02-26 00:00:00	\N	195.75	195.75	0.00	\N	\N	\N
289	1	\N	2026-02-27	1158.50	33.74	Walk-in	Cash	Paid	0.00	2026-02-27 00:00:00	\N	1158.50	1158.50	0.00	\N	\N	\N
290	1	\N	2026-02-27	2392.59	69.69	Walk-in	Cash	Paid	0.00	2026-02-27 00:00:00	\N	2392.59	2392.59	0.00	\N	\N	\N
291	1	\N	2026-02-27	2015.61	58.71	Walk-in	Cash	Paid	0.00	2026-02-27 00:00:00	\N	2115.61	2115.61	100.00	\N	\N	\N
292	1	\N	2026-02-27	1626.95	47.39	Walk-in	Cash	Paid	0.00	2026-02-27 00:00:00	\N	1636.95	1636.95	10.00	\N	\N	\N
293	1	\N	2026-02-28	692.68	20.18	Walk-in	Cash	Paid	0.00	2026-02-28 00:00:00	\N	692.68	692.68	0.00	\N	\N	\N
294	1	\N	2026-02-28	329.60	9.60	Walk-in	Cash	Paid	0.00	2026-02-28 00:00:00	\N	329.60	329.60	0.00	\N	\N	\N
295	1	\N	2026-02-28	358.58	10.44	Walk-in	Cash	Paid	0.00	2026-02-28 00:00:00	\N	358.58	358.58	0.00	\N	\N	\N
296	1	\N	2026-02-28	2681.52	78.10	Walk-in	Cash	Paid	0.00	2026-02-28 00:00:00	\N	2691.52	2691.52	10.00	\N	\N	\N
297	1	\N	2026-02-28	507.79	14.79	Walk-in	Cash	Paid	0.00	2026-02-28 00:00:00	\N	507.79	507.79	0.00	\N	\N	\N
298	1	\N	2026-03-02	6441.76	187.62	Walk-in	Cash	Paid	0.00	2026-03-02 00:00:00	\N	6491.76	6491.76	50.00	\N	\N	\N
299	1	\N	2026-03-02	474.62	13.82	Walk-in	Cash	Paid	0.00	2026-03-02 00:00:00	\N	474.62	474.62	0.00	\N	\N	\N
300	1	\N	2026-03-02	1319.72	38.44	Walk-in	Cash	Paid	0.00	2026-03-02 00:00:00	\N	1419.72	1419.72	100.00	\N	\N	\N
301	1	\N	2026-03-02	1303.98	37.98	Walk-in	Cash	Paid	0.00	2026-03-02 00:00:00	\N	1303.98	1303.98	0.00	\N	\N	\N
302	1	\N	2026-03-03	901.25	26.25	Walk-in	Cash	Paid	0.00	2026-03-03 00:00:00	\N	1001.25	1001.25	100.00	\N	\N	\N
303	1	\N	2026-03-04	1606.68	46.80	Walk-in	Cash	Paid	0.00	2026-03-04 00:00:00	\N	1616.68	1616.68	10.00	\N	\N	\N
304	1	\N	2026-03-04	3854.05	112.25	Walk-in	Cash	Paid	0.00	2026-03-04 00:00:00	\N	3954.05	3954.05	100.00	\N	\N	\N
305	1	\N	2026-03-04	41.20	1.20	Walk-in	Cash	Paid	0.00	2026-03-04 00:00:00	\N	41.20	41.20	0.00	\N	\N	\N
306	1	\N	2026-03-05	194.05	5.65	Walk-in	Cash	Paid	0.00	2026-03-05 00:00:00	\N	204.05	204.05	10.00	\N	\N	\N
307	1	\N	2026-03-05	333.72	9.72	Walk-in	Cash	Paid	0.00	2026-03-05 00:00:00	\N	333.72	333.72	0.00	\N	\N	\N
308	1	\N	2026-03-05	2184.63	63.63	Walk-in	Cash	Paid	0.00	2026-03-05 00:00:00	\N	2234.63	2234.63	50.00	\N	\N	\N
309	1	\N	2026-03-05	6636.17	193.29	Walk-in	Cash	Paid	0.00	2026-03-05 00:00:00	\N	6736.17	6736.17	100.00	\N	\N	\N
310	1	\N	2026-03-05	393.46	11.46	Walk-in	Cash	Paid	0.00	2026-03-05 00:00:00	\N	403.46	403.46	10.00	\N	\N	\N
311	1	\N	2026-03-06	661.58	19.27	Walk-in	Cash	Paid	0.00	2026-03-06 00:00:00	\N	761.58	761.58	100.00	\N	\N	\N
312	1	\N	2026-03-06	618.00	18.00	Walk-in	Cash	Paid	0.00	2026-03-06 00:00:00	\N	668.00	668.00	50.00	\N	\N	\N
313	1	\N	2026-03-06	103.00	3.00	Walk-in	Cash	Paid	0.00	2026-03-06 00:00:00	\N	103.00	103.00	0.00	\N	\N	\N
314	1	\N	2026-03-06	1141.16	33.24	Walk-in	Cash	Paid	0.00	2026-03-06 00:00:00	\N	1141.16	1141.16	0.00	\N	\N	\N
315	1	\N	2026-03-07	252.68	7.36	Walk-in	Cash	Paid	0.00	2026-03-07 00:00:00	\N	352.68	352.68	100.00	\N	\N	\N
316	1	\N	2026-03-07	721.00	21.00	Walk-in	Cash	Paid	0.00	2026-03-07 00:00:00	\N	721.00	721.00	0.00	\N	\N	\N
317	1	\N	2026-03-07	297.67	8.67	Walk-in	Cash	Paid	0.00	2026-03-07 00:00:00	\N	307.67	307.67	10.00	\N	\N	\N
318	1	\N	2026-03-07	37.08	1.08	Walk-in	Cash	Paid	0.00	2026-03-07 00:00:00	\N	87.08	87.08	50.00	\N	\N	\N
319	1	\N	2026-03-08	762.65	22.21	Walk-in	Cash	Paid	0.00	2026-03-08 00:00:00	\N	862.65	862.65	100.00	\N	\N	\N
320	1	\N	2026-03-08	2935.50	85.50	Walk-in	Cash	Paid	0.00	2026-03-08 00:00:00	\N	2935.50	2935.50	0.00	\N	\N	\N
321	1	\N	2026-03-09	1532.64	44.64	Walk-in	Cash	Paid	0.00	2026-03-09 00:00:00	\N	1542.64	1542.64	10.00	\N	\N	\N
322	1	\N	2026-03-09	5359.30	156.10	Walk-in	Cash	Paid	0.00	2026-03-09 00:00:00	\N	5409.30	5409.30	50.00	\N	\N	\N
323	1	\N	2026-03-10	508.90	14.82	Walk-in	Cash	Paid	0.00	2026-03-10 00:00:00	\N	608.90	608.90	100.00	\N	\N	\N
324	1	\N	2026-03-10	2768.64	80.64	Walk-in	Cash	Paid	0.00	2026-03-10 00:00:00	\N	2768.64	2768.64	0.00	\N	\N	\N
325	1	\N	2026-03-10	819.88	23.88	Walk-in	Cash	Paid	0.00	2026-03-10 00:00:00	\N	819.88	819.88	0.00	\N	\N	\N
326	1	\N	2026-03-10	414.70	12.08	Walk-in	Cash	Paid	0.00	2026-03-10 00:00:00	\N	464.70	464.70	50.00	\N	\N	\N
327	1	\N	2026-03-12	172.83	5.03	Walk-in	Cash	Paid	0.00	2026-03-12 00:00:00	\N	272.83	272.83	100.00	\N	\N	\N
328	1	\N	2026-03-12	1378.16	40.14	Walk-in	Cash	Paid	0.00	2026-03-12 00:00:00	\N	1478.16	1478.16	100.00	\N	\N	\N
329	1	\N	2026-03-12	8410.20	244.96	Walk-in	Cash	Paid	0.00	2026-03-12 00:00:00	\N	8420.20	8420.20	10.00	\N	\N	\N
330	1	\N	2026-03-13	1339.00	39.00	Walk-in	Cash	Paid	0.00	2026-03-13 00:00:00	\N	1349.00	1349.00	10.00	\N	\N	\N
331	1	\N	2026-03-13	3918.12	114.12	Walk-in	Cash	Paid	0.00	2026-03-13 00:00:00	\N	3928.12	3928.12	10.00	\N	\N	\N
332	1	\N	2026-03-13	295.33	8.60	Walk-in	Cash	Paid	0.00	2026-03-13 00:00:00	\N	395.33	395.33	100.00	\N	\N	\N
333	1	\N	2026-03-13	265.12	7.72	Walk-in	Cash	Paid	0.00	2026-03-13 00:00:00	\N	265.12	265.12	0.00	\N	\N	\N
334	1	\N	2026-03-14	500.58	14.58	Walk-in	Cash	Paid	0.00	2026-03-14 00:00:00	\N	500.58	500.58	0.00	\N	\N	\N
335	1	\N	2026-03-15	323.90	9.43	Walk-in	Cash	Paid	0.00	2026-03-15 00:00:00	\N	423.90	423.90	100.00	\N	\N	\N
336	1	\N	2026-03-16	491.31	14.31	Walk-in	Cash	Paid	0.00	2026-03-16 00:00:00	\N	491.31	491.31	0.00	\N	\N	\N
337	1	\N	2026-03-16	780.25	22.73	Walk-in	Cash	Paid	0.00	2026-03-16 00:00:00	\N	790.25	790.25	10.00	\N	\N	\N
338	1	\N	2026-03-17	571.35	16.64	Walk-in	Cash	Paid	0.00	2026-03-17 00:00:00	\N	621.35	621.35	50.00	\N	\N	\N
339	1	\N	2026-03-17	662.90	19.31	Walk-in	Cash	Paid	0.00	2026-03-17 00:00:00	\N	662.90	662.90	0.00	\N	\N	\N
340	1	\N	2026-03-17	222.25	6.47	Walk-in	Cash	Paid	0.00	2026-03-17 00:00:00	\N	322.25	322.25	100.00	\N	\N	\N
341	1	\N	2026-03-17	837.77	24.40	Walk-in	Cash	Paid	0.00	2026-03-17 00:00:00	\N	937.77	937.77	100.00	\N	\N	\N
342	1	\N	2026-03-18	10.30	0.30	Walk-in	Cash	Paid	0.00	2026-03-18 00:00:00	\N	60.30	60.30	50.00	\N	\N	\N
343	1	\N	2026-03-19	442.90	12.90	Walk-in	Cash	Paid	0.00	2026-03-19 00:00:00	\N	492.90	492.90	50.00	\N	\N	\N
344	1	\N	2026-03-19	962.84	28.04	Walk-in	Cash	Paid	0.00	2026-03-19 00:00:00	\N	1012.84	1012.84	50.00	\N	\N	\N
345	1	\N	2026-03-19	4159.90	121.16	Walk-in	Cash	Paid	0.00	2026-03-19 00:00:00	\N	4159.90	4159.90	0.00	\N	\N	\N
346	1	\N	2026-03-19	471.74	13.74	Walk-in	Cash	Paid	0.00	2026-03-19 00:00:00	\N	481.74	481.74	10.00	\N	\N	\N
347	1	\N	2026-03-20	362.46	10.56	Walk-in	Cash	Paid	0.00	2026-03-20 00:00:00	\N	362.46	362.46	0.00	\N	\N	\N
348	1	\N	2026-03-20	4381.60	127.62	Walk-in	Cash	Paid	0.00	2026-03-20 00:00:00	\N	4431.60	4431.60	50.00	\N	\N	\N
349	1	\N	2026-03-20	4270.54	124.38	Walk-in	Cash	Paid	0.00	2026-03-20 00:00:00	\N	4370.54	4370.54	100.00	\N	\N	\N
350	1	\N	2026-03-21	738.43	21.51	Walk-in	Cash	Paid	0.00	2026-03-21 00:00:00	\N	788.43	788.43	50.00	\N	\N	\N
351	1	\N	2026-03-21	22.66	0.66	Walk-in	Cash	Paid	0.00	2026-03-21 00:00:00	\N	32.66	32.66	10.00	\N	\N	\N
352	1	\N	2026-03-22	1019.48	29.69	Walk-in	Cash	Paid	0.00	2026-03-22 00:00:00	\N	1069.48	1069.48	50.00	\N	\N	\N
353	1	\N	2026-03-22	4350.72	126.72	Walk-in	Cash	Paid	0.00	2026-03-22 00:00:00	\N	4360.72	4360.72	10.00	\N	\N	\N
354	1	\N	2026-03-23	123.60	3.60	Walk-in	Cash	Paid	0.00	2026-03-23 00:00:00	\N	223.60	223.60	100.00	\N	\N	\N
355	1	\N	2026-03-23	215.99	6.29	Walk-in	Cash	Paid	0.00	2026-03-23 00:00:00	\N	265.99	265.99	50.00	\N	\N	\N
356	1	\N	2026-03-23	714.22	20.80	Walk-in	Cash	Paid	0.00	2026-03-23 00:00:00	\N	814.22	814.22	100.00	\N	\N	\N
357	1	\N	2026-03-23	152.67	4.45	Walk-in	Cash	Paid	0.00	2026-03-23 00:00:00	\N	162.67	162.67	10.00	\N	\N	\N
358	1	\N	2026-03-23	1018.37	29.66	Walk-in	Cash	Paid	0.00	2026-03-23 00:00:00	\N	1018.37	1018.37	0.00	\N	\N	\N
359	1	\N	2026-03-24	4595.04	133.84	Walk-in	Cash	Paid	0.00	2026-03-24 00:00:00	\N	4605.04	4605.04	10.00	\N	\N	\N
360	1	\N	2026-03-24	745.67	21.72	Walk-in	Cash	Paid	0.00	2026-03-24 00:00:00	\N	845.67	845.67	100.00	\N	\N	\N
361	1	\N	2026-03-24	891.37	25.96	Walk-in	Cash	Paid	0.00	2026-03-24 00:00:00	\N	891.37	891.37	0.00	\N	\N	\N
362	1	\N	2026-03-24	638.97	18.61	Walk-in	Cash	Paid	0.00	2026-03-24 00:00:00	\N	648.97	648.97	10.00	\N	\N	\N
363	1	\N	2026-03-24	1305.01	38.01	Walk-in	Cash	Paid	0.00	2026-03-24 00:00:00	\N	1315.01	1315.01	10.00	\N	\N	\N
364	1	\N	2026-03-26	596.37	17.37	Walk-in	Cash	Paid	0.00	2026-03-26 00:00:00	\N	606.37	606.37	10.00	\N	\N	\N
365	1	\N	2026-03-26	162.74	4.74	Walk-in	Cash	Paid	0.00	2026-03-26 00:00:00	\N	172.74	172.74	10.00	\N	\N	\N
366	1	\N	2026-03-26	648.90	18.90	Walk-in	Cash	Paid	0.00	2026-03-26 00:00:00	\N	648.90	648.90	0.00	\N	\N	\N
367	1	\N	2026-03-26	500.17	14.57	Walk-in	Cash	Paid	0.00	2026-03-26 00:00:00	\N	500.17	500.17	0.00	\N	\N	\N
368	1	\N	2026-03-26	226.60	6.60	Walk-in	Cash	Paid	0.00	2026-03-26 00:00:00	\N	226.60	226.60	0.00	\N	\N	\N
369	1	\N	2026-03-27	24.72	0.72	Walk-in	Cash	Paid	0.00	2026-03-27 00:00:00	\N	24.72	24.72	0.00	\N	\N	\N
370	1	\N	2026-03-27	144.20	4.20	Walk-in	Cash	Paid	0.00	2026-03-27 00:00:00	\N	194.20	194.20	50.00	\N	\N	\N
371	1	\N	2026-03-27	1261.75	36.75	Walk-in	Cash	Paid	0.00	2026-03-27 00:00:00	\N	1311.75	1311.75	50.00	\N	\N	\N
372	1	\N	2026-03-28	154.50	4.50	Walk-in	Cash	Paid	0.00	2026-03-28 00:00:00	\N	154.50	154.50	0.00	\N	\N	\N
373	1	\N	2026-03-28	164.80	4.80	Walk-in	Cash	Paid	0.00	2026-03-28 00:00:00	\N	164.80	164.80	0.00	\N	\N	\N
374	1	\N	2026-03-29	191.27	5.57	Walk-in	Cash	Paid	0.00	2026-03-29 00:00:00	\N	191.27	191.27	0.00	\N	\N	\N
375	1	\N	2026-03-29	5665.82	165.02	Walk-in	Cash	Paid	0.00	2026-03-29 00:00:00	\N	5665.82	5665.82	0.00	\N	\N	\N
376	1	\N	2026-03-29	1770.94	51.58	Walk-in	Cash	Paid	0.00	2026-03-29 00:00:00	\N	1780.94	1780.94	10.00	\N	\N	\N
377	1	\N	2026-03-29	30.90	0.90	Walk-in	Cash	Paid	0.00	2026-03-29 00:00:00	\N	80.90	80.90	50.00	\N	\N	\N
378	1	\N	2026-03-30	809.58	23.58	Walk-in	Cash	Paid	0.00	2026-03-30 00:00:00	\N	859.58	859.58	50.00	\N	\N	\N
379	1	\N	2026-03-30	4.12	0.12	Walk-in	Cash	Paid	0.00	2026-03-30 00:00:00	\N	14.12	14.12	10.00	\N	\N	\N
380	1	\N	2026-03-31	3530.20	102.82	Walk-in	Cash	Paid	0.00	2026-03-31 00:00:00	\N	3630.20	3630.20	100.00	\N	\N	\N
381	1	\N	2026-03-31	504.63	14.70	Walk-in	Cash	Paid	0.00	2026-03-31 00:00:00	\N	554.63	554.63	50.00	\N	\N	\N
382	1	\N	2026-03-31	185.40	5.40	Walk-in	Cash	Paid	0.00	2026-03-31 00:00:00	\N	185.40	185.40	0.00	\N	\N	\N
383	1	\N	2026-04-01	7861.43	228.97	Walk-in	Cash	Paid	0.00	2026-04-01 00:00:00	\N	7911.43	7911.43	50.00	\N	\N	\N
384	1	\N	2026-04-01	381.10	11.10	Walk-in	Cash	Paid	0.00	2026-04-01 00:00:00	\N	481.10	481.10	100.00	\N	\N	\N
385	1	\N	2026-04-01	1392.05	40.55	Walk-in	Cash	Paid	0.00	2026-04-01 00:00:00	\N	1402.05	1402.05	10.00	\N	\N	\N
386	1	\N	2026-04-01	245.35	7.15	Walk-in	Cash	Paid	0.00	2026-04-01 00:00:00	\N	295.35	295.35	50.00	\N	\N	\N
387	1	\N	2026-04-01	4.12	0.12	Walk-in	Cash	Paid	0.00	2026-04-01 00:00:00	\N	14.12	14.12	10.00	\N	\N	\N
388	1	\N	2026-04-02	2027.04	59.04	Walk-in	Cash	Paid	0.00	2026-04-02 00:00:00	\N	2127.04	2127.04	100.00	\N	\N	\N
389	1	\N	2026-04-02	1323.92	38.56	Walk-in	Cash	Paid	0.00	2026-04-02 00:00:00	\N	1333.92	1333.92	10.00	\N	\N	\N
390	1	\N	2026-04-03	859.54	25.04	Walk-in	Cash	Paid	0.00	2026-04-03 00:00:00	\N	859.54	859.54	0.00	\N	\N	\N
391	1	\N	2026-04-04	132.87	3.87	Walk-in	Cash	Paid	0.00	2026-04-04 00:00:00	\N	232.87	232.87	100.00	\N	\N	\N
392	1	\N	2026-04-04	406.85	11.85	Walk-in	Cash	Paid	0.00	2026-04-04 00:00:00	\N	416.85	416.85	10.00	\N	\N	\N
393	1	\N	2026-04-05	5866.88	170.88	Walk-in	Cash	Paid	0.00	2026-04-05 00:00:00	\N	5876.88	5876.88	10.00	\N	\N	\N
394	1	\N	2026-04-06	1375.87	40.07	Walk-in	Cash	Paid	0.00	2026-04-06 00:00:00	\N	1425.87	1425.87	50.00	\N	\N	\N
395	1	\N	2026-04-06	949.66	27.66	Walk-in	Cash	Paid	0.00	2026-04-06 00:00:00	\N	999.66	999.66	50.00	\N	\N	\N
396	1	\N	2026-04-06	928.44	27.04	Walk-in	Cash	Paid	0.00	2026-04-06 00:00:00	\N	928.44	928.44	0.00	\N	\N	\N
397	1	\N	2026-04-06	247.20	7.20	Walk-in	Cash	Paid	0.00	2026-04-06 00:00:00	\N	247.20	247.20	0.00	\N	\N	\N
398	1	\N	2026-04-06	403.76	11.76	Walk-in	Cash	Paid	0.00	2026-04-06 00:00:00	\N	413.76	413.76	10.00	\N	\N	\N
\.


--
-- Data for Name: sold_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sold_items (sold_item_id, invoice_id, product_id, return_id, quantity, unit_price, subtotal, total_amount) FROM stdin;
369	275	18	\N	2	110.00	220.00	220.00
370	275	19	\N	2	100.00	200.00	200.00
371	275	20	\N	1	50.00	50.00	50.00
372	275	15	\N	1	150.00	150.00	150.00
373	275	13	\N	1	30.00	30.00	30.00
374	275	17	\N	1	90.00	90.00	90.00
375	275	6	\N	2	375.00	750.00	750.00
376	275	27	\N	2	120.00	240.00	240.00
377	275	26	\N	2	25.00	50.00	50.00
378	276	315	\N	2	80.00	160.00	160.00
379	276	301	\N	1	100.00	100.00	100.00
380	276	323	\N	1	50.00	50.00	50.00
381	276	303	\N	1	420.00	420.00	420.00
382	276	307	\N	1	150.00	150.00	150.00
383	276	227	\N	1	286.00	286.00	286.00
384	276	376	\N	1	250.00	250.00	250.00
385	276	425	\N	1	218.93	218.93	218.93
386	276	296	\N	1	120.00	120.00	120.00
387	276	443	\N	1	311.92	311.92	311.92
388	277	289	\N	1	50.00	50.00	50.00
389	277	384	\N	1	433.34	433.34	433.34
390	278	324	\N	1	110.00	110.00	110.00
391	278	291	\N	1	50.00	50.00	50.00
392	278	384	\N	1	433.34	433.34	433.34
393	279	323	\N	1	50.00	50.00	50.00
394	279	301	\N	1	100.00	100.00	100.00
395	279	153	\N	1	136.50	136.50	136.50
396	279	310	\N	1	125.00	125.00	125.00
397	279	425	\N	1	218.93	218.93	218.93
398	279	280	\N	1	100.00	100.00	100.00
399	279	306	\N	1	125.00	125.00	125.00
400	279	296	\N	1	120.00	120.00	120.00
401	279	322	\N	1	180.00	180.00	180.00
402	279	288	\N	1	180.00	180.00	180.00
403	279	189	\N	1	25.00	25.00	25.00
404	279	272	\N	6	350.00	2100.00	2100.00
405	279	152	\N	10	200.00	2000.00	2000.00
406	280	384	\N	8	433.34	3466.72	3466.72
407	281	289	\N	1	50.00	50.00	50.00
408	281	291	\N	1	50.00	50.00	50.00
409	281	290	\N	1	150.00	150.00	150.00
410	282	289	\N	1	50.00	50.00	50.00
411	283	289	\N	2	50.00	100.00	100.00
412	284	292	\N	1	250.00	250.00	250.00
413	284	324	\N	1	110.00	110.00	110.00
414	284	315	\N	1	80.00	80.00	80.00
415	284	126	\N	1	150.00	150.00	150.00
416	285	454	\N	1	346.32	346.32	346.32
417	286	132	\N	3	6.15	18.45	18.45
418	286	269	\N	3	0.00	0.00	0.00
419	286	186	\N	4	3.00	12.00	12.00
420	287	411	\N	4	269.44	1077.76	1077.76
421	287	227	\N	1	220.00	220.00	220.00
422	288	134	\N	4	1.00	4.00	4.00
423	288	447	\N	1	176.05	176.05	176.05
424	288	118	\N	1	10.00	10.00	10.00
425	289	356	\N	3	150.00	450.00	450.00
426	289	453	\N	1	282.76	282.76	282.76
427	289	196	\N	4	98.00	392.00	392.00
428	290	110	\N	1	2196.40	2196.40	2196.40
429	290	17	\N	3	35.50	106.50	106.50
430	290	131	\N	4	5.00	20.00	20.00
431	291	401	\N	3	54.47	163.41	163.41
432	291	386	\N	4	231.81	927.24	927.24
433	291	404	\N	3	288.75	866.25	866.25
434	292	379	\N	2	188.28	376.56	376.56
435	292	219	\N	3	390.00	1170.00	1170.00
436	292	143	\N	2	16.50	33.00	33.00
437	293	290	\N	4	75.00	300.00	300.00
438	293	446	\N	3	117.50	352.50	352.50
439	293	76	\N	2	10.00	20.00	20.00
440	294	127	\N	2	160.00	320.00	320.00
441	295	313	\N	3	115.38	346.14	346.14
442	295	115	\N	2	1.00	2.00	2.00
443	296	272	\N	2	180.00	360.00	360.00
444	296	368	\N	2	1041.71	2083.42	2083.42
445	296	89	\N	4	40.00	160.00	160.00
446	297	270	\N	1	100.00	100.00	100.00
447	297	230	\N	1	99.00	99.00	99.00
448	297	15	\N	3	98.00	294.00	294.00
449	298	42	\N	2	80.00	160.00	160.00
450	298	349	\N	1	58.50	58.50	58.50
451	298	337	\N	4	1508.91	6035.64	6035.64
452	299	139	\N	4	13.40	53.60	53.60
453	299	233	\N	4	1.00	4.00	4.00
454	299	434	\N	3	134.40	403.20	403.20
455	300	445	\N	4	245.32	981.28	981.28
456	300	319	\N	3	70.00	210.00	210.00
457	300	74	\N	3	30.00	90.00	90.00
458	301	247	\N	1	1026.00	1026.00	1026.00
459	301	69	\N	4	60.00	240.00	240.00
460	302	6	\N	2	325.00	650.00	650.00
461	302	307	\N	3	75.00	225.00	225.00
462	303	76	\N	2	10.00	20.00	20.00
463	303	419	\N	4	332.47	1329.88	1329.88
464	303	184	\N	3	70.00	210.00	210.00
465	304	118	\N	1	10.00	10.00	10.00
466	304	340	\N	4	820.45	3281.80	3281.80
467	304	281	\N	3	150.00	450.00	450.00
468	305	76	\N	4	10.00	40.00	40.00
469	306	427	\N	3	62.80	188.40	188.40
470	307	192	\N	2	162.00	324.00	324.00
471	308	283	\N	2	0.00	0.00	0.00
472	308	103	\N	3	2.00	6.00	6.00
473	308	200	\N	3	705.00	2115.00	2115.00
474	309	422	\N	4	288.32	1153.28	1153.28
475	309	109	\N	4	1322.40	5289.60	5289.60
476	310	294	\N	4	15.00	60.00	60.00
477	310	153	\N	3	105.00	315.00	315.00
478	310	142	\N	1	7.00	7.00	7.00
479	311	342	\N	2	79.19	158.38	158.38
480	311	395	\N	3	102.31	306.93	306.93
481	311	101	\N	3	59.00	177.00	177.00
482	312	296	\N	3	60.00	180.00	180.00
483	312	212	\N	1	300.00	300.00	300.00
484	312	89	\N	3	40.00	120.00	120.00
485	313	324	\N	4	25.00	100.00	100.00
486	314	227	\N	2	220.00	440.00	440.00
487	314	392	\N	3	192.64	577.92	577.92
488	314	80	\N	3	30.00	90.00	90.00
489	315	445	\N	1	245.32	245.32	245.32
490	316	357	\N	1	700.00	700.00	700.00
491	317	168	\N	4	22.00	88.00	88.00
492	317	218	\N	1	41.00	41.00	41.00
493	317	42	\N	2	80.00	160.00	160.00
494	318	26	\N	2	12.00	24.00	24.00
495	318	187	\N	4	3.00	12.00	12.00
496	319	414	\N	4	75.73	302.92	302.92
497	319	428	\N	2	99.21	198.42	198.42
498	319	380	\N	1	239.10	239.10	239.10
499	320	291	\N	2	25.00	50.00	50.00
500	320	357	\N	4	700.00	2800.00	2800.00
501	321	73	\N	3	5.00	15.00	15.00
502	321	54	\N	1	75.00	75.00	75.00
503	321	408	\N	4	349.50	1398.00	1398.00
504	322	109	\N	3	1322.40	3967.20	3967.20
505	322	268	\N	4	250.00	1000.00	1000.00
506	322	101	\N	4	59.00	236.00	236.00
507	323	427	\N	4	62.80	251.20	251.20
508	323	35	\N	1	197.88	197.88	197.88
509	323	304	\N	1	45.00	45.00	45.00
510	324	112	\N	2	1194.00	2388.00	2388.00
511	324	202	\N	3	100.00	300.00	300.00
512	325	271	\N	3	60.00	180.00	180.00
513	325	197	\N	3	12.00	36.00	36.00
514	325	203	\N	4	145.00	580.00	580.00
515	326	176	\N	2	99.00	198.00	198.00
516	326	395	\N	2	102.31	204.62	204.62
517	327	139	\N	2	13.40	26.80	26.80
518	327	251	\N	2	45.00	90.00	90.00
519	327	217	\N	1	51.00	51.00	51.00
520	328	433	\N	3	63.18	189.54	189.54
521	328	31	\N	4	287.12	1148.48	1148.48
522	329	338	\N	4	1865.81	7463.24	7463.24
523	329	296	\N	3	60.00	180.00	180.00
524	329	33	\N	2	261.00	522.00	522.00
525	330	6	\N	4	325.00	1300.00	1300.00
526	331	111	\N	2	1862.00	3724.00	3724.00
527	331	333	\N	1	80.00	80.00	80.00
528	332	410	\N	1	286.73	286.73	286.73
529	333	62	\N	3	85.80	257.40	257.40
530	334	348	\N	3	162.00	486.00	486.00
531	335	268	\N	1	250.00	250.00	250.00
532	335	401	\N	1	54.47	54.47	54.47
533	335	78	\N	1	10.00	10.00	10.00
534	336	42	\N	4	80.00	320.00	320.00
535	336	218	\N	2	41.00	82.00	82.00
536	336	55	\N	1	75.00	75.00	75.00
537	337	15	\N	4	98.00	392.00	392.00
538	337	435	\N	3	51.84	155.52	155.52
539	337	280	\N	3	70.00	210.00	210.00
540	338	296	\N	2	60.00	120.00	120.00
541	338	394	\N	1	190.71	190.71	190.71
542	338	204	\N	1	244.00	244.00	244.00
543	339	441	\N	3	134.53	403.59	403.59
544	339	160	\N	1	190.00	190.00	190.00
545	339	84	\N	2	25.00	50.00	50.00
546	340	387	\N	2	107.89	215.78	215.78
547	341	248	\N	3	90.00	270.00	270.00
548	341	432	\N	1	323.57	323.57	323.57
549	341	64	\N	2	109.90	219.80	219.80
550	342	273	\N	1	10.00	10.00	10.00
551	343	376	\N	2	127.00	254.00	254.00
552	343	277	\N	2	88.00	176.00	176.00
553	344	243	\N	1	934.80	934.80	934.80
554	345	246	\N	4	885.40	3541.60	3541.60
555	345	449	\N	2	248.57	497.14	497.14
556	346	92	\N	1	338.00	338.00	338.00
557	346	81	\N	4	30.00	120.00	120.00
558	347	159	\N	1	106.00	106.00	106.00
559	347	436	\N	1	245.90	245.90	245.90
560	348	244	\N	2	776.99	1553.98	1553.98
561	348	358	\N	3	900.00	2700.00	2700.00
562	349	39	\N	1	300.00	300.00	300.00
563	349	325	\N	2	1923.08	3846.16	3846.16
564	350	180	\N	2	1.76	3.52	3.52
565	350	357	\N	1	700.00	700.00	700.00
566	350	138	\N	1	13.40	13.40	13.40
567	351	168	\N	1	22.00	22.00	22.00
568	352	442	\N	3	271.43	814.29	814.29
569	352	350	\N	3	58.50	175.50	175.50
570	353	247	\N	4	1026.00	4104.00	4104.00
571	353	69	\N	2	60.00	120.00	120.00
572	354	224	\N	4	30.00	120.00	120.00
573	355	67	\N	3	69.90	209.70	209.70
574	356	394	\N	2	190.71	381.42	381.42
575	356	216	\N	3	104.00	312.00	312.00
576	357	128	\N	3	27.74	83.22	83.22
577	357	140	\N	1	45.00	45.00	45.00
578	357	169	\N	1	20.00	20.00	20.00
579	358	80	\N	3	30.00	90.00	90.00
580	358	449	\N	3	248.57	745.71	745.71
581	358	217	\N	3	51.00	153.00	153.00
582	359	141	\N	3	38.00	114.00	114.00
583	359	250	\N	2	2173.60	4347.20	4347.20
584	360	449	\N	1	248.57	248.57	248.57
585	360	313	\N	1	115.38	115.38	115.38
586	360	272	\N	2	180.00	360.00	360.00
587	361	394	\N	3	190.71	572.13	572.13
588	361	379	\N	1	188.28	188.28	188.28
589	361	265	\N	1	105.00	105.00	105.00
590	362	383	\N	2	130.18	260.36	260.36
591	362	65	\N	4	90.00	360.00	360.00
592	363	131	\N	1	5.00	5.00	5.00
593	363	308	\N	1	62.00	62.00	62.00
594	363	212	\N	4	300.00	1200.00	1200.00
595	364	355	\N	3	85.00	255.00	255.00
596	364	192	\N	2	162.00	324.00	324.00
597	365	123	\N	1	8.00	8.00	8.00
598	365	54	\N	2	75.00	150.00	150.00
599	366	209	\N	2	315.00	630.00	630.00
600	367	298	\N	4	6.00	24.00	24.00
601	367	174	\N	2	145.00	290.00	290.00
602	367	62	\N	2	85.80	171.60	171.60
603	368	285	\N	2	100.00	200.00	200.00
604	368	222	\N	1	20.00	20.00	20.00
605	369	189	\N	3	8.00	24.00	24.00
606	370	371	\N	2	70.00	140.00	140.00
607	371	353	\N	4	70.00	280.00	280.00
608	371	209	\N	3	315.00	945.00	945.00
609	372	253	\N	2	75.00	150.00	150.00
610	373	284	\N	2	80.00	160.00	160.00
611	374	170	\N	3	61.90	185.70	185.70
612	375	316	\N	1	120.00	120.00	120.00
613	375	249	\N	3	1793.60	5380.80	5380.80
614	376	4	\N	3	260.00	780.00	780.00
615	376	418	\N	3	233.93	701.79	701.79
616	376	237	\N	3	79.19	237.57	237.57
617	377	224	\N	1	30.00	30.00	30.00
618	378	175	\N	4	59.00	236.00	236.00
619	378	9	\N	2	275.00	550.00	550.00
620	379	117	\N	4	1.00	4.00	4.00
621	380	247	\N	2	1026.00	2052.00	2052.00
622	380	209	\N	4	315.00	1260.00	1260.00
623	380	313	\N	1	115.38	115.38	115.38
624	381	455	\N	1	219.93	219.93	219.93
625	381	311	\N	3	90.00	270.00	270.00
626	382	140	\N	4	45.00	180.00	180.00
627	383	398	\N	2	77.03	154.06	154.06
628	383	108	\N	4	1869.60	7478.40	7478.40
629	384	66	\N	1	70.00	70.00	70.00
630	384	207	\N	4	30.00	120.00	120.00
631	384	69	\N	3	60.00	180.00	180.00
632	385	188	\N	3	269.00	807.00	807.00
633	385	348	\N	3	162.00	486.00	486.00
634	385	350	\N	1	58.50	58.50	58.50
635	386	158	\N	1	225.00	225.00	225.00
636	386	161	\N	1	13.20	13.20	13.20
637	387	266	\N	2	2.00	4.00	4.00
638	388	234	\N	2	951.00	1902.00	1902.00
639	388	326	\N	1	60.00	60.00	60.00
640	388	103	\N	3	2.00	6.00	6.00
641	389	300	\N	4	100.00	400.00	400.00
642	389	31	\N	3	287.12	861.36	861.36
643	389	377	\N	4	6.00	24.00	24.00
644	390	405	\N	1	318.50	318.50	318.50
645	390	47	\N	4	80.00	320.00	320.00
646	390	100	\N	4	49.00	196.00	196.00
647	391	276	\N	1	5.00	5.00	5.00
648	391	172	\N	2	62.00	124.00	124.00
649	392	332	\N	2	40.00	80.00	80.00
650	392	265	\N	3	105.00	315.00	315.00
651	393	362	\N	4	1115.00	4460.00	4460.00
652	393	1	\N	4	309.00	1236.00	1236.00
653	394	344	\N	4	279.00	1116.00	1116.00
654	394	64	\N	2	109.90	219.80	219.80
655	395	259	\N	3	75.00	225.00	225.00
656	395	424	\N	2	281.73	563.46	563.46
657	395	412	\N	1	133.54	133.54	133.54
658	396	145	\N	2	8.00	16.00	16.00
659	396	246	\N	1	885.40	885.40	885.40
660	397	301	\N	4	50.00	200.00	200.00
661	397	263	\N	4	10.00	40.00	40.00
662	398	60	\N	1	12.00	12.00	12.00
663	398	144	\N	4	95.00	380.00	380.00
664	399	279	\N	1	100.00	100.00	100.00
665	399	289	\N	1	50.00	50.00	50.00
666	400	126	\N	1	150.00	150.00	150.00
667	400	307	\N	1	150.00	150.00	150.00
668	400	310	\N	1	125.00	125.00	125.00
669	400	304	\N	1	90.00	90.00	90.00
\.


--
-- Data for Name: supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier (supplier_id, supplier_name, address, email, contact_number, product_supplied, total_orders, status, completed_orders) FROM stdin;
1	Oils and tires	Bagumbong Dulo Caloocan City	sohitado@gmail.com	09388347797	Transmission & Drivetrain	1	Active	1
2	Jvt and cworks products	68 7th ave, Corner C. Cordero St, Grace Park West, Caloocan, 1402 Metro Manila	jvtscooterphil@gmail.com	09178368680	Spareparts	0	Active	0
3	Al Cycle and Lube Center	15 Rainbow Ave, Caloocan, Metro Manila	\N	\N	spare parts and accessories like brake pads, brake shoe, brake and clutch cables etc	0	Active	0
4	 PS Cycle Center	Speedtrail Cycle Center, 18 Miller Avenue, Barangay Bungad, Quezon City, Philippines, 1105	\N	09988870858	Spareparts	0	Active	0
6	Corsa Tires: JKSS tire center	Valenzuela, Philippines, 1440	jksstrading@yahoo.com	09230836830	CORSA MOTORCYCLE TIRES,AMARON MOTORCYCLE Battery,Mobil Lubricants	0	Active	0
5	Dunlop tires: Tireshackk Inc	347 Ortigas Avenue, Greenhills East, Mandaluyong, Philippines, 1554	ti.tireshakk.mktg@gmail.com	09175406116	Tires	0	Active	0
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (setting_key, setting_value, description, updated_at) FROM stdin;
tax_rate	0.03	Current sales tax rate (3%)	2026-04-07 12:03:07.534637
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, employee_id, password_hash, full_name, role, is_active, created_date, last_login, username, permissions_json, email, address, password_changed_at) FROM stdin;
5	5	$2b$12$VgRwjBoSFya1PQCA.oFJsO5zH4.0CjctNy/T2s3Mnjk3ez2p7Myri	Cedie logatoc	Manager	t	2026-04-06	2026-04-06	Cedie	{"Reports": ["View", "Generate Report"]}	chrisdennis2204@gmail.com	\N	\N
6	6	$2b$12$RigIcCTGd1LDCnoPEy/N7ew/430fYmjY2pPn1LDPDPBFN1f1HQ/CS	John Doe	Cashier	t	2026-04-07	2026-04-07	Totoyz	{}	harpoon0930@gmail.com	\N	\N
7	7	$2b$12$phwvMc3i/zwuuzsj.A2ERuvSeRW/XkpSIdSABqCnn2VqCc8Cygmgu	John Rovhic Sohitado	Administrator	t	2026-04-07	2026-04-07	Halcrow01	{}	totoybata9@gmail.com	\N	\N
2	2	$2b$12$.co.oj4vz6HcCIL99pn68e6lUqJNgeA8mDMtWhCqjfgL7POYZql8G	ROBEK!	Administrator	t	2026-03-25	2026-04-07	rootadminnginamo	{}	\N	\N	\N
\.


--
-- Name: analytics_model_runs_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analytics_model_runs_run_id_seq', 759, true);


--
-- Name: auditlog_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditlog_log_id_seq', 33, true);


--
-- Name: inventory_stock_events_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_stock_events_event_id_seq', 23, true);


--
-- Name: lowstockalerts_alert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lowstockalerts_alert_id_seq', 1, false);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_payment_id_seq', 36, true);


--
-- Name: product_price_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_price_history_history_id_seq', 39, true);


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

SELECT pg_catalog.setval('public.sales_invoice_id_seq', 400, true);


--
-- Name: sold_items_sold_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sold_items_sold_item_id_seq', 669, true);


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
-- PostgreSQL database dump complete
--

\unrestrict waMzjVBDZBpmJeOx97FPeCkLAALebqu2wj2kwWkrKDC3LIbyCxfhjYsYtYo4nwc

